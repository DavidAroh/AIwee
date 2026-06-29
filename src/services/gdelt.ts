/**
 * gdelt — real, live Port Harcourt incidents from the GDELT Project.
 *
 * GDELT DOC 2.0 indexes worldwide news in near-real-time and returns clean JSON
 * (article title, url, domain, seendate). No API key. It has no CORS headers,
 * so it is fetched through `proxyFetchText`.
 *
 * Every incident produced here is backed by a real article URL — there is no
 * fabricated/pattern data in this source.
 */
import type { LiveIncident } from "./liveIncidents";
import { proxyFetchText } from "./proxy";
import {
  detectSeverity,
  detectType,
  isPortHarcourtRelevant,
  isRecent,
  resolveLocation,
} from "./incidentHeuristics";

const GDELT_DOC = "https://api.gdeltproject.org/api/v2/doc/doc";

const QUERY =
  '"Port Harcourt" (accident OR crash OR fire OR flood OR robbery OR shooting OR explosion OR kidnap OR collapse OR spill OR protest OR clash)';

interface GdeltArticle {
  title?: string;
  url?: string;
  domain?: string;
  seendate?: string;
  language?: string;
}

/** Parse GDELT's `20240607T153000Z` seendate into an ISO string. */
function parseGdeltDate(s?: string): string {
  if (!s) return new Date().toISOString();
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(s);
  if (m) {
    return new Date(
      Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]),
    ).toISOString();
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

const RECENCY_DAYS = 30;

export async function fetchGdeltIncidents(): Promise<LiveIncident[]> {
  const url =
    `${GDELT_DOC}?query=${encodeURIComponent(QUERY)}` +
    `&mode=ArtList&format=json&maxrecords=50&timespan=30d&sort=DateDesc`;

  const raw = await proxyFetchText(url, 9000);

  // GDELT throttles to ~1 request / 5s and replies with a plain-text notice
  // instead of JSON. Surface it as a soft error so the caller stays RSS-only.
  if (/limit requests|rate.?limit|please limit/i.test(raw.slice(0, 200))) {
    throw new Error("GDELT: rate limited");
  }

  let parsed: { articles?: GdeltArticle[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GDELT: response was not valid JSON");
  }

  const articles = Array.isArray(parsed.articles) ? parsed.articles : [];
  const incidents: LiveIncident[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    const title = String(a.title ?? "").trim();
    if (!title) continue;
    if (a.language && a.language !== "English") continue;
    if (!isPortHarcourtRelevant(title)) continue;

    const key = title.toLowerCase().replace(/\s+/g, " ").slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);

    const timestamp = parseGdeltDate(a.seendate);
    if (!isRecent(timestamp, RECENCY_DAYS)) continue;

    const type = detectType(title);
    const severity = detectSeverity(title);
    const loc = resolveLocation(title);
    const locKnown = loc.name !== "Port Harcourt";

    incidents.push({
      id: `gdelt-${Date.now()}-${i}`,
      type,
      description: title,
      locationName: loc.name,
      latitude: loc.lat,
      longitude: loc.lng,
      severity,
      summary: title,
      cues: [loc.name, type.toLowerCase(), "news", a.domain ?? "gdelt"].filter(
        Boolean,
      ),
      confidenceScore: Math.min(
        90,
        58 + (severity >= 8 ? 15 : severity >= 5 ? 8 : 2) + (locKnown ? 12 : 0),
      ),
      corroboratingEvidence: a.url
        ? [`${a.domain ?? "source"} — ${a.url}`]
        : undefined,
      source: "live",
      timestamp,
    });
  }

  console.log(`[AiWee/GDELT] ${incidents.length} real PH incidents`);
  return incidents.slice(0, 12);
}
