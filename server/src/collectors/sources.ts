/**
 * sources — server-side incident collection.
 *
 * Runs in Node, so there are no CORS restrictions and no proxy chain: we fetch
 * Google News RSS, GDELT, Nigerian outlet feeds, and Reddit directly. A polite
 * descriptive User-Agent also gets us past the anti-bot walls that block the
 * browser build.
 */
import { randomUUID } from "node:crypto";
import type { Incident, IncidentType } from "../types.js";
import {
  detectSeverity,
  detectType,
  isPortHarcourtRelevant,
  isRecent,
  parseRssItems,
  resolveLocation,
  stripHtml,
} from "./heuristics.js";

const UA =
  "AiWee/1.0 (+https://aiwee.app; civic incident monitor for Port Harcourt)";
const RECENCY_DAYS = Number(process.env.INCIDENT_RECENCY_DAYS) || 30;

async function fetchText(url: string, timeoutMs = 10_000): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": UA, Accept: "*/*" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const nowIso = () => new Date().toISOString();

function confidence(sourceKind: Incident["sourceKind"], severity: number, locKnown: boolean) {
  const base = sourceKind === "social" ? 42 : 58;
  const cap = sourceKind === "social" ? 68 : 90;
  return clamp(
    base + (severity >= 8 ? 15 : severity >= 5 ? 8 : 2) + (locKnown ? 12 : 0),
    0,
    cap,
  );
}

// ── Google News RSS ─────────────────────────────────────────────────────────────
const GNEWS_QUERIES = [
  "Port Harcourt accident OR crash OR fire OR flood OR robbery OR shooting OR explosion",
  "Rivers State incident emergency police fire kidnap collapse",
  "Port Harcourt gas OR oil spill OR pipeline OR building collapse OR tanker",
];

async function collectGoogleNews(): Promise<Incident[]> {
  const out: Incident[] = [];
  for (const q of GNEWS_QUERIES) {
    try {
      const xml = await fetchText(
        `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-NG&gl=NG&ceid=NG:en`,
      );
      for (const item of parseRssItems(xml)) {
        const full = `${item.title} ${item.description}`;
        if (!isPortHarcourtRelevant(full)) continue;
        const type = detectType(full);
        const sev = detectSeverity(full);
        const loc = resolveLocation(full);
        const locKnown = loc.name !== "Port Harcourt";
        const ts = new Date(item.pubDate).toISOString();
        if (!isRecent(ts, RECENCY_DAYS)) continue;
        let outlet = "Google News";
        try {
          outlet = new URL(item.link).hostname.replace("www.", "");
        } catch {
          /* keep default */
        }
        out.push({
          id: `rss-${randomUUID()}`,
          type,
          description: item.description.slice(0, 200) || item.title,
          locationName: loc.name,
          latitude: loc.lat,
          longitude: loc.lng,
          severity: sev,
          summary: item.title.replace(/\s*[-|–]\s*[\w\s]+$/, "").trim() || item.title,
          cues: [loc.name, type.toLowerCase(), "news", outlet],
          confidenceScore: confidence("news", sev, locKnown),
          corroboratingEvidence: item.link ? [`${outlet} — ${item.link}`] : undefined,
          sourceKind: "news",
          outlet,
          url: item.link || undefined,
          timestamp: ts,
        });
      }
    } catch {
      /* query failed — continue with the others */
    }
  }
  return out;
}

// ── GDELT DOC 2.0 ────────────────────────────────────────────────────────────────
async function collectGdelt(): Promise<Incident[]> {
  const query =
    '"Port Harcourt" (accident OR crash OR fire OR flood OR robbery OR shooting OR explosion OR kidnap OR collapse OR spill OR protest OR clash)';
  const url =
    `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}` +
    `&mode=ArtList&format=json&maxrecords=50&timespan=30d&sort=DateDesc`;
  const raw = await fetchText(url, 12_000);
  if (/limit requests|rate.?limit|please limit/i.test(raw.slice(0, 200))) return [];
  const parsed = JSON.parse(raw) as { articles?: any[] };
  const arts = Array.isArray(parsed.articles) ? parsed.articles : [];
  const out: Incident[] = [];
  for (const a of arts) {
    const title = String(a.title ?? "").trim();
    if (!title || (a.language && a.language !== "English")) continue;
    if (!isPortHarcourtRelevant(title)) continue;
    const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(a.seendate ?? "");
    const ts = m
      ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])).toISOString()
      : nowIso();
    if (!isRecent(ts, RECENCY_DAYS)) continue;
    const type = detectType(title);
    const sev = detectSeverity(title);
    const loc = resolveLocation(title);
    const locKnown = loc.name !== "Port Harcourt";
    out.push({
      id: `gdelt-${randomUUID()}`,
      type,
      description: title,
      locationName: loc.name,
      latitude: loc.lat,
      longitude: loc.lng,
      severity: sev,
      summary: title,
      cues: [loc.name, type.toLowerCase(), "news", a.domain ?? "gdelt"],
      confidenceScore: confidence("news", sev, locKnown),
      corroboratingEvidence: a.url ? [`${a.domain ?? "source"} — ${a.url}`] : undefined,
      sourceKind: "news",
      outlet: a.domain,
      url: a.url,
      timestamp: ts,
    });
  }
  return out;
}

// ── Nigerian outlet RSS ──────────────────────────────────────────────────────────
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

async function collectOutlets(): Promise<Incident[]> {
  const results = await Promise.allSettled(
    OUTLETS.map(async (o) => ({ outlet: o.name, xml: await fetchText(o.url, 10_000) })),
  );
  const out: Incident[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    const { outlet, xml } = r.value;
    for (const item of parseRssItems(xml)) {
      const full = `${item.title} ${item.description}`;
      if (!isPortHarcourtRelevant(full)) continue;
      const type = detectType(full);
      if (
        type === "Other" &&
        !/emergency|rescue|evacuat|disaster|hazard|spill|leak|collaps|protest|riot|curfew/i.test(full)
      )
        continue;
      const sev = detectSeverity(full);
      const loc = resolveLocation(full);
      const locKnown = loc.name !== "Port Harcourt";
      const ts = new Date(item.pubDate).toISOString();
      if (!isRecent(ts, RECENCY_DAYS)) continue;
      out.push({
        id: `feed-${randomUUID()}`,
        type,
        description: item.description.slice(0, 200) || item.title,
        locationName: loc.name,
        latitude: loc.lat,
        longitude: loc.lng,
        severity: sev,
        summary: item.title,
        cues: [loc.name, type.toLowerCase(), "news", outlet],
        confidenceScore: confidence("news", sev, locKnown),
        corroboratingEvidence: item.link ? [`${outlet} — ${item.link}`] : undefined,
        sourceKind: "news",
        outlet,
        url: item.link || undefined,
        timestamp: ts,
      });
    }
  }
  return out;
}

// ── Reddit (social) ──────────────────────────────────────────────────────────────
async function collectReddit(): Promise<Incident[]> {
  const searches = [
    `https://www.reddit.com/search.json?q=${encodeURIComponent(
      '"Port Harcourt" (accident OR fire OR flood OR robbery OR shooting OR kidnap)',
    )}&sort=new&t=month&limit=50&raw_json=1`,
    `https://www.reddit.com/r/Nigeria/search.json?q=${encodeURIComponent(
      '"Port Harcourt" OR "Rivers State"',
    )}&restrict_sr=1&sort=new&t=month&limit=50&raw_json=1`,
  ];
  const out: Incident[] = [];
  for (const url of searches) {
    try {
      const json = JSON.parse(await fetchText(url, 10_000));
      const children = json?.data?.children ?? [];
      for (const c of children) {
        const d = c?.data;
        if (!d?.title) continue;
        const text = `${d.title} ${(d.selftext ?? "").slice(0, 400)}`;
        if (!isPortHarcourtRelevant(text)) continue;
        const type = detectType(text);
        if (type === "Other") continue;
        const sev = detectSeverity(text);
        const loc = resolveLocation(text);
        const ts = d.created_utc ? new Date(d.created_utc * 1000).toISOString() : nowIso();
        if (!isRecent(ts, RECENCY_DAYS)) continue;
        const engagement = Math.min(10, Math.floor(((d.score ?? 0) + (d.num_comments ?? 0)) / 10));
        out.push({
          id: `reddit-${randomUUID()}`,
          type,
          description: String(d.title).slice(0, 200),
          locationName: loc.name,
          latitude: loc.lat,
          longitude: loc.lng,
          severity: sev,
          summary: d.title,
          cues: [loc.name, type.toLowerCase(), "social", `r/${d.subreddit ?? "reddit"}`],
          confidenceScore: clamp(42 + engagement + (sev >= 8 ? 8 : 0), 0, 68),
          corroboratingEvidence: d.permalink
            ? [`Reddit — https://www.reddit.com${d.permalink}`]
            : undefined,
          sourceKind: "social",
          outlet: "Reddit",
          url: d.permalink ? `https://www.reddit.com${d.permalink}` : undefined,
          timestamp: ts,
        });
      }
    } catch {
      /* one search failed — continue */
    }
  }
  return out;
}

// ── Orchestrator ─────────────────────────────────────────────────────────────────
const isDup = (a: Incident, list: Incident[]) =>
  list.some(
    (e) =>
      e.type === a.type &&
      Math.abs(e.latitude - a.latitude) < 0.005 &&
      Math.abs(e.longitude - a.longitude) < 0.005,
  );

export interface CollectResult {
  incidents: Incident[];
  counts: Record<string, number>;
}

export async function collectAll(): Promise<CollectResult> {
  const [gnews, gdelt, outlets, reddit] = await Promise.allSettled([
    collectGoogleNews(),
    collectGdelt(),
    collectOutlets(),
    collectReddit(),
  ]);
  const val = (r: PromiseSettledResult<Incident[]>) =>
    r.status === "fulfilled" ? r.value : [];

  const gn = val(gnews);
  const gd = val(gdelt);
  const ou = val(outlets);
  const rd = val(reddit);

  const candidates = [...gn, ...gd, ...ou, ...rd]
    .filter((i) => isRecent(i.timestamp, RECENCY_DAYS))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const merged: Incident[] = [];
  const seen = new Set<string>();
  for (const inc of candidates) {
    const fp = (inc.summary || inc.description).toLowerCase().replace(/\s+/g, " ").trim().slice(0, 55);
    if (fp && seen.has(fp)) continue;
    if (isDup(inc, merged)) continue;
    if (fp) seen.add(fp);
    merged.push(inc);
  }

  return {
    incidents: merged.slice(0, 40),
    counts: { gnews: gn.length, gdelt: gd.length, outlets: ou.length, reddit: rd.length },
  };
}
