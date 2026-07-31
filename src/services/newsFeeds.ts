/**
 * newsFeeds — direct RSS scraping of major Nigerian news outlets.
 *
 * Complements Google News aggregation by pulling each outlet's own feed, which
 * surfaces stories Google hasn't indexed yet (or ranks below the fold). All
 * WordPress-style RSS 2.0, fetched through `proxyFetchText`, classified with the
 * shared heuristics, PH-filtered, and deduped by headline.
 *
 * Every incident is backed by a real article URL from a named outlet.
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

const RECENCY_DAYS = 30;

// Outlets with reliable public RSS. General feeds — PH stories are filtered out
// of the national stream by isPortHarcourtRelevant.
const OUTLETS: { name: string; url: string }[] = [
  { name: "Punch",         url: "https://punchng.com/feed/" },
  { name: "Vanguard",      url: "https://www.vanguardngr.com/feed/" },
  { name: "Daily Post",    url: "https://dailypost.ng/feed/" },
  { name: "Premium Times", url: "https://www.premiumtimesng.com/feed" },
  { name: "The Cable",     url: "https://www.thecable.ng/feed" },
  { name: "Guardian NG",   url: "https://guardian.ng/feed/" },
  { name: "Channels TV",   url: "https://www.channelstv.com/feed/" },
  { name: "Leadership",    url: "https://leadership.ng/feed/" },
  { name: "Tribune",       url: "https://tribuneonlineng.com/feed/" },
];

interface FeedItem {
  outlet: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
}

function parseFeed(xml: string, outlet: string): FeedItem[] {
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    if (doc.querySelector("parsererror")) return [];
    return Array.from(doc.querySelectorAll("item")).map((el) => ({
      outlet,
      title: el.querySelector("title")?.textContent?.trim() ?? "",
      description: el.querySelector("description")?.textContent?.trim() ?? "",
      link: el.querySelector("link")?.textContent?.trim() ?? "",
      pubDate:
        el.querySelector("pubDate")?.textContent?.trim() ??
        new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

function itemToIncident(item: FeedItem, index: number): LiveIncident | null {
  const fullText = `${item.title} ${stripHtml(item.description)}`;
  if (!isPortHarcourtRelevant(fullText) || isNoise(fullText)) return null;

  const type = detectType(fullText);
  // National feeds carry politics/sport too — only keep texts that classified
  // as a concrete safety type, or that carry emergency-flavoured wording.
  if (
    type === "Other" &&
    !/emergency|rescue|evacuat|disaster|hazard|spill|leak|collaps|protest|riot|curfew/i.test(
      fullText,
    )
  ) {
    return null;
  }

  const severity = detectSeverity(fullText);
  const loc = resolveLocation(fullText);
  const locKnown = loc.name !== "Port Harcourt";

  const timestamp = (() => {
    try {
      return new Date(item.pubDate).toISOString();
    } catch {
      return new Date().toISOString();
    }
  })();

  return {
    id: `feed-${Date.now()}-${index}`,
    type,
    description: stripHtml(item.description).slice(0, 200) || item.title,
    locationName: loc.name,
    latitude: loc.lat,
    longitude: loc.lng,
    severity,
    summary: item.title,
    cues: [loc.name, type.toLowerCase(), "news", item.outlet].filter(Boolean),
    confidenceScore: Math.min(
      90,
      58 + (severity >= 8 ? 15 : severity >= 5 ? 8 : 2) + (locKnown ? 12 : 0),
    ),
    corroboratingEvidence: item.link
      ? [`${item.outlet} — ${item.link}`]
      : undefined,
    source: "live",
    timestamp,
  };
}

export async function fetchOutletFeedIncidents(): Promise<LiveIncident[]> {
  const results = await Promise.allSettled(
    OUTLETS.map(async (o) => parseFeed(await proxyFetchText(o.url, 9000), o.name)),
  );

  const items: FeedItem[] = [];
  let okFeeds = 0;
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.length > 0) {
      okFeeds++;
      items.push(...r.value);
    }
  }
  if (items.length === 0) {
    console.warn("[AiWee/Feeds] no outlet feeds reachable");
    return [];
  }

  // Dedup by headline fingerprint across outlets
  const seen = new Set<string>();
  const incidents = items
    .filter((item) => {
      const key = item.title.toLowerCase().replace(/\s+/g, " ").slice(0, 60);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item, i) => itemToIncident(item, i))
    .filter((x): x is LiveIncident => x !== null)
    .filter((x) => isRecent(x.timestamp, RECENCY_DAYS))
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

  console.log(
    `[AiWee/Feeds] ${incidents.length} PH incidents from ${okFeeds}/${OUTLETS.length} outlet feeds`,
  );
  return incidents.slice(0, 12);
}
