/**
 * googleNewsRSS — real Port Harcourt incidents from Google News RSS.
 *
 * Zero API keys. Google News RSS is public and refreshed every ~15 min. It has
 * no CORS headers, so feeds are fetched through `proxyFetchText` (same-origin
 * dev proxy, or a public proxy chain in prod).
 *
 * Every incident produced here is backed by a real article link, classified
 * with the shared heuristics, and filtered to the last 7 days.
 */
import type { LiveIncident } from "./liveIncidents";
import { proxyFetchText } from "./proxy";
import {
  detectSeverity,
  detectType,
  isNoise,
  isPortHarcourtRelevant,
  isRecent,
  resolveLocation,
  stripHtml,
} from "./incidentHeuristics";

// ── Google News RSS queries (safety topics, NG edition) ───────────────────────
const PH_QUERIES = [
  "Port Harcourt accident OR crash OR fire OR flood OR robbery OR shooting OR explosion",
  "Rivers State incident emergency police fire kidnap collapse",
  "Port Harcourt gas OR oil spill OR pipeline OR building collapse OR tanker",
  '"Port Harcourt" OR "Obio-Akpor" emergency OR rescue OR casualty OR injured',
];

// Real PH safety news doesn't surface every day, so a 7-day window leaves the
// map nearly empty. 30 days keeps every incident real + source-linked while
// giving a populated, useful picture. Markers still show their true age.
const RECENCY_DAYS = 30;

function rssUrl(query: string) {
  return (
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}` +
    `&hl=en-NG&gl=NG&ceid=NG:en`
  );
}

interface RssItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source?: string;
}

function parseRssXml(xml: string): RssItem[] {
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const items = Array.from(doc.querySelectorAll("item"));
    return items.map((el) => ({
      title: el.querySelector("title")?.textContent?.trim() ?? "",
      description: el.querySelector("description")?.textContent?.trim() ?? "",
      link: el.querySelector("link")?.textContent?.trim() ?? "",
      pubDate:
        el.querySelector("pubDate")?.textContent?.trim() ??
        new Date().toISOString(),
      source: el.querySelector("source")?.textContent?.trim(),
    }));
  } catch {
    return [];
  }
}

async function fetchRssFeed(query: string): Promise<RssItem[]> {
  const xml = await proxyFetchText(rssUrl(query), 7000);
  return parseRssXml(xml);
}

function rssItemToIncident(item: RssItem, index: number): LiveIncident | null {
  const fullText = `${item.title} ${stripHtml(item.description)}`;
  if (!isPortHarcourtRelevant(fullText) || isNoise(fullText)) return null;

  const type = detectType(fullText);
  const severity = detectSeverity(fullText);
  const loc = resolveLocation(fullText);

  const summary = item.title.replace(/\s*[-|–]\s*[\w\s]+$/, "").trim();
  const description = stripHtml(item.description).slice(0, 200) || summary;

  const locKnown = loc.name !== "Port Harcourt";
  const confidence = Math.min(
    88,
    55 + (severity >= 8 ? 15 : severity >= 5 ? 8 : 2) + (locKnown ? 12 : 0),
  );

  const sourceName =
    item.source ??
    (() => {
      try {
        return new URL(item.link).hostname.replace("www.", "");
      } catch {
        return "news";
      }
    })();

  const timestamp = (() => {
    try {
      return new Date(item.pubDate).toISOString();
    } catch {
      return new Date().toISOString();
    }
  })();

  return {
    id: `rss-${Date.now()}-${index}`,
    type,
    description,
    locationName: loc.name,
    latitude: loc.lat,
    longitude: loc.lng,
    severity,
    summary,
    cues: [loc.name, type.toLowerCase(), "news", sourceName].filter(Boolean),
    confidenceScore: confidence,
    corroboratingEvidence: item.link ? [`${sourceName} — ${item.link}`] : undefined,
    source: "live",
    timestamp,
  };
}

export async function fetchGoogleNewsIncidents(): Promise<LiveIncident[]> {
  const results = await Promise.allSettled(PH_QUERIES.map(fetchRssFeed));

  const allItems: RssItem[] = [];
  for (const r of results) if (r.status === "fulfilled") allItems.push(...r.value);

  if (allItems.length === 0) {
    console.warn("[AiWee/RSS] No Google News items — proxy may be unavailable");
    return [];
  }

  // Dedup by title fingerprint
  const seen = new Set<string>();
  const unique = allItems.filter((item) => {
    const key = item.title.toLowerCase().replace(/\s+/g, " ").slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const incidents = unique
    .map((item, i) => rssItemToIncident(item, i))
    .filter((x): x is LiveIncident => x !== null)
    .filter((x) => isRecent(x.timestamp, RECENCY_DAYS)) // only genuinely recent news
    .sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

  console.log(`[AiWee/RSS] ${incidents.length} recent PH incidents from Google News`);
  return incidents.slice(0, 14);
}
