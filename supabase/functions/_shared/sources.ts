// sources — server-side incident collection (Deno). Runs inside a Supabase Edge
// Function, so there is no CORS restriction and no proxy chain: Google News RSS,
// GDELT, Nigerian outlet feeds, and Reddit are fetched directly with a polite
// descriptive User-Agent (which also clears the anti-bot walls that block the
// browser build).
//
// Output rows match the public.incidents table columns.
import {
  dedupKey,
  detectSeverity,
  detectType,
  isNoise,
  isPortHarcourtRelevant,
  isRecent,
  parseRssItems,
  resolveLocation,
} from "./heuristics.ts";

export interface IncidentRow {
  id: string;
  type: string;
  description: string;
  summary: string;
  location_name: string;
  latitude: number;
  longitude: number;
  severity: number;
  confidence: number;
  source_kind: "news" | "social" | "citizen";
  outlet: string | null;
  url: string | null;
  cues: string[];
  corroborating_evidence: string[];
  dedup_key: string;
  event_time: string;
}

const UA = "AiWee/1.0 (+https://aiwee.app; civic incident monitor for Port Harcourt)";
const RECENCY_DAYS = Number(Deno.env.get("INCIDENT_RECENCY_DAYS")) || 30;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const nowIso = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

async function fetchText(url: string, timeoutMs = 10_000): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": UA, Accept: "*/*" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function confidence(kind: IncidentRow["source_kind"], sev: number, locKnown: boolean) {
  const base = kind === "social" ? 42 : 58;
  const cap = kind === "social" ? 68 : 90;
  return clamp(base + (sev >= 8 ? 15 : sev >= 5 ? 8 : 2) + (locKnown ? 12 : 0), 0, cap);
}

function row(
  idPrefix: string,
  kind: IncidentRow["source_kind"],
  o: {
    title: string;
    description: string;
    ts: string;
    outlet: string | null;
    url: string | null;
    extraCue: string;
    conf?: number;
  },
): IncidentRow {
  const full = `${o.title} ${o.description}`;
  const type = detectType(full);
  const sev = detectSeverity(full);
  const loc = resolveLocation(full);
  const locKnown = loc.name !== "Port Harcourt";
  return {
    id: `${idPrefix}-${uid()}`,
    type,
    description: o.description.slice(0, 200) || o.title,
    summary: o.title,
    location_name: loc.name,
    latitude: loc.lat,
    longitude: loc.lng,
    severity: sev,
    confidence: o.conf ?? confidence(kind, sev, locKnown),
    source_kind: kind,
    outlet: o.outlet,
    url: o.url,
    cues: [loc.name, type.toLowerCase(), kind === "social" ? "social" : "news", o.extraCue],
    corroborating_evidence: o.url ? [`${o.outlet ?? "source"} — ${o.url}`] : [],
    dedup_key: dedupKey(type, o.title),
    event_time: o.ts,
  };
}

const GNEWS_QUERIES = [
  "Port Harcourt accident OR crash OR fire OR flood OR robbery OR shooting OR explosion",
  "Rivers State incident emergency police fire kidnap collapse",
  "Port Harcourt gas OR oil spill OR pipeline OR building collapse OR tanker",
];

async function collectGoogleNews(): Promise<IncidentRow[]> {
  const out: IncidentRow[] = [];
  for (const q of GNEWS_QUERIES) {
    try {
      const xml = await fetchText(
        `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-NG&gl=NG&ceid=NG:en`,
      );
      for (const item of parseRssItems(xml)) {
        const full = `${item.title} ${item.description}`;
        if (!isPortHarcourtRelevant(full) || isNoise(full)) continue;
        const ts = new Date(item.pubDate).toISOString();
        if (!isRecent(ts, RECENCY_DAYS)) continue;
        let outlet = "Google News";
        try {
          outlet = new URL(item.link).hostname.replace("www.", "");
        } catch { /* keep default */ }
        out.push(
          row("rss", "news", {
            title: item.title.replace(/\s*[-|–]\s*[\w\s]+$/, "").trim() || item.title,
            description: item.description,
            ts,
            outlet,
            url: item.link || null,
            extraCue: outlet,
          }),
        );
      }
    } catch { /* continue */ }
  }
  return out;
}

async function collectGdelt(): Promise<IncidentRow[]> {
  const query =
    '"Port Harcourt" (accident OR crash OR fire OR flood OR robbery OR shooting OR explosion OR kidnap OR collapse OR spill OR protest OR clash)';
  const url =
    `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}` +
    `&mode=ArtList&format=json&maxrecords=50&timespan=30d&sort=DateDesc`;
  const raw = await fetchText(url, 12_000);
  if (/limit requests|rate.?limit|please limit/i.test(raw.slice(0, 200))) return [];
  const parsed = JSON.parse(raw) as { articles?: any[] };
  const out: IncidentRow[] = [];
  for (const a of parsed.articles ?? []) {
    const title = String(a.title ?? "").trim();
    if (!title || (a.language && a.language !== "English")) continue;
    if (!isPortHarcourtRelevant(title) || isNoise(title)) continue;
    const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(a.seendate ?? "");
    const ts = m
      ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])).toISOString()
      : nowIso();
    if (!isRecent(ts, RECENCY_DAYS)) continue;
    out.push(
      row("gdelt", "news", {
        title,
        description: title,
        ts,
        outlet: a.domain ?? null,
        url: a.url ?? null,
        extraCue: a.domain ?? "gdelt",
      }),
    );
  }
  return out;
}

const OUTLETS: { name: string; url: string }[] = [
  { name: "Punch", url: "https://punchng.com/feed/" },
  { name: "Vanguard", url: "https://www.vanguardngr.com/feed/" },
  { name: "Daily Post", url: "https://dailypost.ng/feed/" },
  { name: "Premium Times", url: "https://www.premiumtimesng.com/feed" },
  { name: "The Cable", url: "https://www.thecable.ng/feed" },
  { name: "Guardian NG", url: "https://guardian.ng/feed/" },
  { name: "Channels TV", url: "https://www.channelstv.com/feed/" },
  { name: "Leadership", url: "https://leadership.ng/feed/" },
];

async function collectOutlets(): Promise<IncidentRow[]> {
  const results = await Promise.allSettled(
    OUTLETS.map(async (o) => ({ outlet: o.name, xml: await fetchText(o.url, 10_000) })),
  );
  const out: IncidentRow[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const item of parseRssItems(r.value.xml)) {
      const full = `${item.title} ${item.description}`;
      if (!isPortHarcourtRelevant(full) || isNoise(full)) continue;
      const type = detectType(full);
      if (
        type === "Other" &&
        !/emergency|rescue|evacuat|disaster|hazard|spill|leak|collaps|protest|riot|curfew/i.test(full)
      ) continue;
      const ts = new Date(item.pubDate).toISOString();
      if (!isRecent(ts, RECENCY_DAYS)) continue;
      out.push(
        row("feed", "news", {
          title: item.title,
          description: item.description,
          ts,
          outlet: r.value.outlet,
          url: item.link || null,
          extraCue: r.value.outlet,
        }),
      );
    }
  }
  return out;
}

async function collectReddit(): Promise<IncidentRow[]> {
  const searches = [
    `https://www.reddit.com/search.json?q=${encodeURIComponent(
      '"Port Harcourt" (accident OR fire OR flood OR robbery OR shooting OR kidnap)',
    )}&sort=new&t=month&limit=50&raw_json=1`,
    `https://www.reddit.com/r/Nigeria/search.json?q=${encodeURIComponent(
      '"Port Harcourt" OR "Rivers State"',
    )}&restrict_sr=1&sort=new&t=month&limit=50&raw_json=1`,
  ];
  const out: IncidentRow[] = [];
  for (const url of searches) {
    try {
      const json = JSON.parse(await fetchText(url, 10_000));
      for (const c of json?.data?.children ?? []) {
        const d = c?.data;
        if (!d?.title) continue;
        const text = `${d.title} ${(d.selftext ?? "").slice(0, 400)}`;
        if (!isPortHarcourtRelevant(text) || isNoise(text)) continue;
        if (detectType(text) === "Other") continue;
        const ts = d.created_utc ? new Date(d.created_utc * 1000).toISOString() : nowIso();
        if (!isRecent(ts, RECENCY_DAYS)) continue;
        const engagement = Math.min(10, Math.floor(((d.score ?? 0) + (d.num_comments ?? 0)) / 10));
        const sev = detectSeverity(text);
        out.push(
          row("reddit", "social", {
            title: d.title,
            description: d.title,
            ts,
            outlet: "Reddit",
            url: d.permalink ? `https://www.reddit.com${d.permalink}` : null,
            extraCue: `r/${d.subreddit ?? "reddit"}`,
            conf: clamp(42 + engagement + (sev >= 8 ? 8 : 0), 0, 68),
          }),
        );
      }
    } catch { /* continue */ }
  }
  return out;
}

const isDup = (a: IncidentRow, list: IncidentRow[]) =>
  list.some(
    (e) =>
      e.type === a.type &&
      Math.abs(e.latitude - a.latitude) < 0.005 &&
      Math.abs(e.longitude - a.longitude) < 0.005,
  );

export async function collectAll(): Promise<{
  incidents: IncidentRow[];
  counts: Record<string, number>;
}> {
  const [gn, gd, ou, rd] = (
    await Promise.allSettled([
      collectGoogleNews(),
      collectGdelt(),
      collectOutlets(),
      collectReddit(),
    ])
  ).map((r) => (r.status === "fulfilled" ? r.value : [])) as IncidentRow[][];

  const candidates = [...gn, ...gd, ...ou, ...rd]
    .filter((i) => isRecent(i.event_time, RECENCY_DAYS))
    .sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());

  const merged: IncidentRow[] = [];
  const seen = new Set<string>();
  for (const inc of candidates) {
    if (seen.has(inc.dedup_key)) continue;
    if (isDup(inc, merged)) continue;
    seen.add(inc.dedup_key);
    merged.push(inc);
  }

  return {
    incidents: merged.slice(0, 40),
    counts: { gnews: gn.length, gdelt: gd.length, outlets: ou.length, reddit: rd.length },
  };
}
