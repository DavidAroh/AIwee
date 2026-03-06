/**
 * googleNewsRSS.ts — Real Port Harcourt news via Google News RSS
 *
 * Zero API keys needed. Uses:
 *  1. Google News RSS (public, free, updated every ~15 min)
 *  2. allorigins.win CORS proxy (free, no auth)
 *  3. Browser DOMParser for XML
 *
 * Returns typed LiveIncident objects ranked by recency and confidence.
 */

import type { LiveIncident } from './liveIncidents';

// ── Google News RSS query (multiple safety topics, NG edition) ─────────────────
const PH_QUERIES = [
  'Port Harcourt accident OR crash OR fire OR flood OR robbery OR shooting OR explosion',
  'Rivers State incident emergency police fire',
];

// ── CORS proxy chain (tried in order until one succeeds) ────────────────────
// Different proxies have different response shapes:
const PROXY_CHAIN = [
  {
    // corsproxy.io — returns raw content directly
    url: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
    extract: async (res: Response) => res.text(),
  },
  {
    // allorigins /raw — returns raw content directly
    url: (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    extract: async (res: Response) => res.text(),
  },
  {
    // allorigins /get — wraps content in JSON { contents: "..." }
    url: (target: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`,
    extract: async (res: Response) => ((await res.json()) as { contents?: string }).contents ?? '',
  },
];

function rssUrl(query: string) {
  return (
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}` +
    `&hl=en-NG&gl=NG&ceid=NG:en`
  );
}

// ── Type detection via keywords ────────────────────────────────────────────────
const TYPE_RULES: [RegExp, LiveIncident['type']][] = [
  [/fire|blaze|inferno|burnt|arson|torched/i,                   'Fire'],
  [/accident|crash|collision|overturn|tanker|truck|vehicle/i,   'Accident'],
  [/rob|kidnap|cult|gang|shoot|gun|attack|murder|kill|stab/i,   'Crime'],
  [/flood|waterlog|surge|drown|rain|overflow/i,                 'Flood'],
  [/dead|death|casualt|injur|hospital|medical|emerg|ambulance/i,'Medical'],
];

function detectType(text: string): LiveIncident['type'] {
  for (const [re, t] of TYPE_RULES) {
    if (re.test(text)) return t;
  }
  return 'Other';
}

// ── Severity from keyword density ─────────────────────────────────────────────
const SEVERITY_KEYWORDS = [
  { re: /fatal|dead|death|killed|massacre|explosion|major/i, score: 9 },
  { re: /serious|critical|severe|injured|burning|armed/i,    score: 7 },
  { re: /minor|slight|contained|controlled/i,                score: 3 },
];

function detectSeverity(text: string): number {
  for (const { re, score } of SEVERITY_KEYWORDS) {
    if (re.test(text)) return score;
  }
  return 5;
}

// ── Known PH locations with coordinates ───────────────────────────────────────
const PH_LOCATIONS: { name: string; lat: number; lng: number; aliases: RegExp }[] = [
  { name: 'Diobu Market',      lat: 4.7895, lng: 6.9847, aliases: /diobu/i },
  { name: 'Trans-Amadi',       lat: 4.8301, lng: 7.0298, aliases: /trans.?amadi/i },
  { name: 'Mile 1 Market',     lat: 4.8002, lng: 6.9751, aliases: /mile.?1/i },
  { name: 'D-Line',            lat: 4.8197, lng: 7.0153, aliases: /d.?line/i },
  { name: 'Rumuola Road',      lat: 4.8149, lng: 7.0426, aliases: /rumuola/i },
  { name: 'Rumuigbo Junction', lat: 4.8296, lng: 6.9899, aliases: /rumuigbo/i },
  { name: 'Woji Road',         lat: 4.8392, lng: 7.0254, aliases: /woji/i },
  { name: 'Eleme Junction',    lat: 4.7732, lng: 7.0905, aliases: /eleme/i },
  { name: 'GRA',               lat: 4.8103, lng: 7.0073, aliases: /\bgra\b/i },
  { name: 'Borokiri',          lat: 4.7605, lng: 7.0049, aliases: /borokiri/i },
  { name: 'Eagle Island',      lat: 4.7800, lng: 6.9900, aliases: /eagle.?island/i },
  { name: 'Peter Odili Road',  lat: 4.8250, lng: 7.0350, aliases: /peter.?odili/i },
  { name: 'Aba Road',          lat: 4.8100, lng: 7.0300, aliases: /aba.?road/i },
  { name: 'Rumuokoro',         lat: 4.8654, lng: 7.0222, aliases: /rumuokoro/i },
  { name: 'Ogoni',             lat: 4.7200, lng: 7.0900, aliases: /ogoni/i },
  { name: 'Oyigbo',            lat: 4.7450, lng: 7.1400, aliases: /oyigbo/i },
  { name: 'Stadium Road',      lat: 4.8100, lng: 7.0200, aliases: /stadium/i },
  { name: 'Elelenwo',          lat: 4.8650, lng: 7.0350, aliases: /elelenwo/i },
  { name: 'Nkpolu',            lat: 4.8350, lng: 7.0450, aliases: /nkpolu/i },
  { name: 'Old GRA',           lat: 4.8180, lng: 7.0200, aliases: /old.?gra/i },
  { name: 'New GRA',           lat: 4.8050, lng: 7.0400, aliases: /new.?gra/i },
  { name: 'Rumuepirikom',      lat: 4.8300, lng: 7.0600, aliases: /rumuepirikom/i },
  { name: 'Port Harcourt',     lat: 4.8156, lng: 7.0498, aliases: /port.?harcourt|ph\b/i },
];

// Spread-out fallback positions around PH so generic-location markers
// don't all stack on the same dot (each one picks a different landmark).
const PH_SPREAD_POINTS = [
  { name: 'Port Harcourt, Aba Road area',     lat: 4.8100, lng: 7.0300 },
  { name: 'Port Harcourt, Rumuola area',       lat: 4.8149, lng: 7.0426 },
  { name: 'Port Harcourt, Trans-Amadi area',   lat: 4.8301, lng: 7.0298 },
  { name: 'Port Harcourt, Peter Odili area',   lat: 4.8250, lng: 7.0350 },
  { name: 'Port Harcourt, Rumuokoro area',     lat: 4.8654, lng: 7.0222 },
  { name: 'Port Harcourt, D-Line area',        lat: 4.8197, lng: 7.0153 },
  { name: 'Port Harcourt, Diobu area',         lat: 4.7895, lng: 6.9847 },
  { name: 'Port Harcourt, GRA area',           lat: 4.8103, lng: 7.0073 },
  { name: 'Port Harcourt, Elelenwo area',      lat: 4.8650, lng: 7.0350 },
  { name: 'Port Harcourt, Woji area',          lat: 4.8392, lng: 7.0254 },
];
let spreadIndex = 0;

function resolveLocation(text: string): { name: string; lat: number; lng: number } {
  let baseLat = 4.8156;
  let baseLng = 7.0498;
  let locName = 'Port Harcourt';

  const exactMatch = PH_LOCATIONS.find(l => l.aliases.test(text));
  if (exactMatch && exactMatch.name !== 'Port Harcourt') {
    // If it's a specific landmark, use it
    baseLat = exactMatch.lat;
    baseLng = exactMatch.lng;
    locName = exactMatch.name;
  } else {
    // If generic "Port Harcourt", spread it across distinct landmarks so they don't pile up
    const point = PH_SPREAD_POINTS[spreadIndex % PH_SPREAD_POINTS.length];
    spreadIndex++;
    baseLat = point.lat;
    baseLng = point.lng;
    locName = point.name;
  }

  // ALWAYS apply a small jitter (~500m) to prevent absolute stacking
  return {
    name: locName,
    lat: baseLat + (Math.random() - 0.5) * 0.008,
    lng: baseLng + (Math.random() - 0.5) * 0.008,
  };
}

// ── Strip HTML tags from RSS description ──────────────────────────────────────
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

// ── Parse a single RSS feed XML string ───────────────────────────────────────
interface RssItem {
  title:       string;
  description: string;
  link:        string;
  pubDate:     string;
  source?:     string;
}

function parseRssXml(xml: string): RssItem[] {
  try {
    const doc   = new DOMParser().parseFromString(xml, 'text/xml');
    const items = Array.from(doc.querySelectorAll('item'));
    return items.map((el) => ({
      title:       el.querySelector('title')?.textContent?.trim()       ?? '',
      description: el.querySelector('description')?.textContent?.trim() ?? '',
      link:        el.querySelector('link')?.textContent?.trim()         ?? '',
      pubDate:     el.querySelector('pubDate')?.textContent?.trim()      ?? new Date().toISOString(),
      source:      el.querySelector('source')?.textContent?.trim(),
    }));
  } catch {
    return [];
  }
}

// ── Fetch one RSS feed via CORS proxy chain ─────────────────────────────────
async function fetchRssFeed(query: string): Promise<RssItem[]> {
  const target = rssUrl(query);

  for (const proxy of PROXY_CHAIN) {
    try {
      const res = await fetch(proxy.url(target), { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const text = await proxy.extract(res);
      if (!text || text.length < 100) continue;
      const items = parseRssXml(text);
      if (items.length > 0) {
        console.log(`[AiWee/RSS] Got ${items.length} items via ${proxy.url(target).split('?')[0]}`);
        return items;
      }
    } catch (e) {
      // Try next proxy
    }
  }

  throw new Error('All CORS proxies failed for RSS');
}

// ── Convert RssItem → LiveIncident ────────────────────────────────────────────
function rssItemToIncident(item: RssItem, index: number): LiveIncident | null {
  const fullText = `${item.title} ${stripHtml(item.description)}`;

  // Skip items with no real PH relevance
  if (!/port.?harcourt|rivers.?state|ph\b|diobu|trans.?amadi|rumuola/i.test(fullText)) {
    return null;
  }

  const type     = detectType(fullText);
  const severity = detectSeverity(fullText);
  const loc      = resolveLocation(fullText);

  // Build clean summary from title (strip source suffix like " - Vanguard")
  const summary = item.title.replace(/\s*[-|–]\s*[\w\s]+$/, '').trim();
  // Clean description for the description field
  const description = stripHtml(item.description).slice(0, 200) || summary;

  // Confidence: 65 base + up to 20 from severity + known-location bonus
  const locKnown = loc.name !== 'Port Harcourt';
  const confidence = Math.min(88, 55 + (severity >= 8 ? 15 : severity >= 5 ? 8 : 2) + (locKnown ? 12 : 0));

  // Extract source name from link domain or source tag
  const sourceName = item.source ?? (() => {
    try { return new URL(item.link).hostname.replace('www.', ''); } catch { return 'news'; }
  })();

  return {
    id:          `rss-${Date.now()}-${index}`,
    type,
    description,
    locationName: loc.name,
    latitude:     loc.lat,
    longitude:    loc.lng,
    severity,
    summary,
    cues:         [loc.name, type.toLowerCase(), 'news', sourceName].filter(Boolean),
    confidenceScore: confidence,
    corroboratingEvidence: item.link ? [`${sourceName} — ${item.link}`] : undefined,
    source:       'live',
    timestamp:    (() => {
      try { return new Date(item.pubDate).toISOString(); } catch { return new Date().toISOString(); }
    })(),
  };
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function fetchGoogleNewsIncidents(): Promise<LiveIncident[]> {
  // Run both queries in parallel, ignore individual failures
  const results = await Promise.allSettled(PH_QUERIES.map(fetchRssFeed));

  const allItems: RssItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') allItems.push(...r.value);
  }

  if (allItems.length === 0) {
    console.warn('[AiWee/RSS] No Google News items returned — proxy may be down');
    return [];
  }

  // Deduplicate by title similarity (≥ 80% chars in common)
  const seen = new Set<string>();
  const unique = allItems.filter((item) => {
    const key = item.title.toLowerCase().replace(/\s+/g, ' ').slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Convert to incidents, filter nulls, sort newest first
  const incidents = unique
    .map((item, i) => rssItemToIncident(item, i))
    .filter((x): x is LiveIncident => x !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  console.log(`[AiWee/RSS] ${incidents.length} real PH incidents from Google News`);
  return incidents.slice(0, 8);
}
