/**
 * socialMedia — live Port Harcourt incident chatter from social platforms.
 *
 * Reddit is the one major platform with a public, key-free JSON API, so it is
 * the social source here (X/Facebook/Instagram are auth-walled and block
 * scraping). Posts come from sitewide search plus r/Nigeria, filtered to PH
 * safety topics and classified with the shared heuristics.
 *
 * Social posts are eyewitness-grade, not editorially verified — confidence is
 * scored lower than news sources, and the crowd-verification flow applies.
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
} from "./incidentHeuristics";

const RECENCY_DAYS = 30;

const SAFETY_TERMS =
  "(accident OR crash OR fire OR flood OR robbery OR shooting OR explosion OR kidnap OR collapse OR spill OR protest)";

const SEARCHES = [
  `https://www.reddit.com/search.json?q=${encodeURIComponent(
    `"Port Harcourt" ${SAFETY_TERMS}`,
  )}&sort=new&t=month&limit=50`,
  `https://www.reddit.com/r/Nigeria/search.json?q=${encodeURIComponent(
    `"Port Harcourt" OR "Rivers State"`,
  )}&restrict_sr=1&sort=new&t=month&limit=50`,
];

interface RedditPost {
  title?: string;
  selftext?: string;
  permalink?: string;
  created_utc?: number;
  subreddit?: string;
  score?: number;
  num_comments?: number;
}

function parseListing(raw: string): RedditPost[] {
  try {
    const json = JSON.parse(raw);
    const children = json?.data?.children;
    if (!Array.isArray(children)) return [];
    return children
      .map((c: any) => c?.data)
      .filter((d: any): d is RedditPost => d && typeof d.title === "string");
  } catch {
    return [];
  }
}

function postToIncident(post: RedditPost, index: number): LiveIncident | null {
  const text = `${post.title ?? ""} ${(post.selftext ?? "").slice(0, 400)}`;
  if (!isPortHarcourtRelevant(text) || isNoise(text)) return null;

  const type = detectType(text);
  // Reddit carries lots of general discussion — require a concrete safety type.
  if (type === "Other") return null;

  const timestamp = post.created_utc
    ? new Date(post.created_utc * 1000).toISOString()
    : new Date().toISOString();

  const severity = detectSeverity(text);
  const loc = resolveLocation(text);

  // Social signal: engagement nudges confidence, but it stays below news-grade.
  const engagement = Math.min(10, Math.floor(((post.score ?? 0) + (post.num_comments ?? 0)) / 10));
  const confidence = Math.min(68, 42 + engagement + (severity >= 8 ? 8 : 0));

  return {
    id: `reddit-${Date.now()}-${index}`,
    type,
    description: (post.title ?? "").slice(0, 200),
    locationName: loc.name,
    latitude: loc.lat,
    longitude: loc.lng,
    severity,
    summary: post.title ?? "",
    cues: [loc.name, type.toLowerCase(), "social", `r/${post.subreddit ?? "reddit"}`],
    confidenceScore: confidence,
    corroboratingEvidence: post.permalink
      ? [`Reddit — https://www.reddit.com${post.permalink}`]
      : undefined,
    source: "live",
    timestamp,
  };
}

export async function fetchSocialMediaIncidents(): Promise<LiveIncident[]> {
  const results = await Promise.allSettled(
    SEARCHES.map((url) => proxyFetchText(url, 9000).then(parseListing)),
  );

  const posts: RedditPost[] = [];
  for (const r of results) if (r.status === "fulfilled") posts.push(...r.value);

  if (posts.length === 0) {
    console.info("[AiWee/Social] no Reddit results (blocked or quiet)");
    return [];
  }

  const seen = new Set<string>();
  const incidents = posts
    .filter((p) => {
      const key = (p.title ?? "").toLowerCase().replace(/\s+/g, " ").slice(0, 60);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((p, i) => postToIncident(p, i))
    .filter((x): x is LiveIncident => x !== null)
    .filter((x) => isRecent(x.timestamp, RECENCY_DAYS))
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

  console.log(`[AiWee/Social] ${incidents.length} PH incidents from Reddit`);
  return incidents.slice(0, 8);
}
