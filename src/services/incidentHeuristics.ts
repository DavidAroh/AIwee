/**
 * incidentHeuristics — shared text→incident heuristics used by every real news
 * source (Google News RSS, GDELT). Keeps type/severity/location classification
 * in one place so all sources behave consistently.
 */
import type { LiveIncident } from "./liveIncidents";

// ── Type detection via keywords ────────────────────────────────────────────────
// Keywords are deliberately narrow: bare words like "overturn", "rain",
// "vehicle" or "surge" match court rulings, weather chat and price stories.
const TYPE_RULES: [RegExp, LiveIncident["type"]][] = [
  [/fire|blaze|inferno|burnt|arson|torched|explosion/i, "Fire"],
  [
    /\baccident\b|crash|collision|collide|hit.?and.?run|tanker|gridlock|(?:truck|bus|lorry|trailer|vehicle)\s+(?:overturn|plunge|ram|somersault)|overturn(?:ed|s)?\s+(?:truck|tanker|bus|lorry|trailer|vehicle)/i,
    "Accident",
  ],
  [/rob|kidnap|abduct|cult|gang|shoot|gunmen|gunshot|\bgun\b|attack|murder|kill|stab|assassin|arrest/i, "Crime"],
  [
    /flood|waterlog|storm surge|tidal surge|drown|torrential|downpour|rainstorm|heavy rain|overflow|erosion|earthquake|quake|landslide|\bstorm\b|windstorm|tornado|cyclone/i,
    "Natural Disaster",
  ],
  [/dead|death|casualt|injur|hospital|medical|emergency|ambulance|outbreak|epidemic|cholera/i, "Medical"],
];

export function detectType(text: string): LiveIncident["type"] {
  for (const [re, t] of TYPE_RULES) if (re.test(text)) return t;
  return "Other";
}

// Hard evidence that something physically happened — used to rescue genuine
// incident stories that also mention courts/politics ("robbery suspects in court").
const STRONG_SIGNAL =
  /\b(kill(?:ed|s|ing)?|dead|death|die[ds]?|injur\w*|wound(?:ed|s)?|victim|crash|collid\w*|collision|raze[ds]?|inferno|blaze|explos\w*|explod\w*|gunmen|gunshot|shoot(?:ing|out)?|kidnap\w*|abduct\w*|robbery|robbers|arson|flood(?:ed|ing|s)?|collaps\w*|spill|drown\w*|rescue[ds]?|evacuat\w*|derail\w*|capsiz\w*|stampede|outbreak|epidemic|cholera)\b/i;

// Coverage that keyword matching mistakes for incidents: politics, courts,
// sports, business, ceremonies ("court overturns...", "attack on policy...").
const NOISE =
  /\b(election\w*|electoral|politic\w*|democracy|party|apc|pdp|inec|senat\w*|assembly|lawmaker|minister|governor(?:ship)?|commissioner|campaign|2027|tribunal|court|suit|lawsuit|litigation|judg(?:e?ment)|verdict|appeal|acquit\w*|impeach\w*|budget|economy|investment|revenue|football|league|match|tournament|award\w*|celebrat\w*|anniversary|appoint\w*|inaugurat\w*|swear(?:ing)?.?in|summit|conference|workshop|empower\w*)\b/i;

/** True when a story reads like politics/courts/sports — not a live incident. */
export function isNoise(text: string): boolean {
  return NOISE.test(text) && !STRONG_SIGNAL.test(text);
}

// ── Severity from keyword density ─────────────────────────────────────────────
const SEVERITY_KEYWORDS = [
  { re: /fatal|dead|death|killed|massacre|explosion|major|collapse/i, score: 9 },
  { re: /serious|critical|severe|injured|burning|armed|trapped/i, score: 7 },
  { re: /minor|slight|contained|controlled|averted/i, score: 3 },
];

export function detectSeverity(text: string): number {
  for (const { re, score } of SEVERITY_KEYWORDS) if (re.test(text)) return score;
  return 5;
}

// ── Known PH locations with coordinates ───────────────────────────────────────
const PH_LOCATIONS: { name: string; lat: number; lng: number; aliases: RegExp }[] = [
  { name: "Diobu Market", lat: 4.7895, lng: 6.9847, aliases: /diobu/i },
  { name: "Trans-Amadi", lat: 4.8301, lng: 7.0298, aliases: /trans.?amadi/i },
  { name: "Mile 1 Market", lat: 4.8002, lng: 6.9751, aliases: /mile.?1/i },
  { name: "D-Line", lat: 4.8197, lng: 7.0153, aliases: /d.?line/i },
  { name: "Rumuola Road", lat: 4.8149, lng: 7.0426, aliases: /rumuola/i },
  { name: "Rumuigbo Junction", lat: 4.8296, lng: 6.9899, aliases: /rumuigbo/i },
  { name: "Woji Road", lat: 4.8392, lng: 7.0254, aliases: /woji/i },
  { name: "Eleme Junction", lat: 4.7732, lng: 7.0905, aliases: /eleme/i },
  { name: "GRA", lat: 4.8103, lng: 7.0073, aliases: /\bgra\b/i },
  { name: "Borokiri", lat: 4.7605, lng: 7.0049, aliases: /borokiri/i },
  { name: "Eagle Island", lat: 4.78, lng: 6.99, aliases: /eagle.?island/i },
  { name: "Peter Odili Road", lat: 4.825, lng: 7.035, aliases: /peter.?odili/i },
  { name: "Aba Road", lat: 4.81, lng: 7.03, aliases: /aba.?road/i },
  { name: "Rumuokoro", lat: 4.8654, lng: 7.0222, aliases: /rumuokoro/i },
  { name: "Obio-Akpor", lat: 4.86, lng: 7.0, aliases: /obio.?akpor/i },
  { name: "Ogoni", lat: 4.72, lng: 7.09, aliases: /ogoni/i },
  { name: "Oyigbo", lat: 4.745, lng: 7.14, aliases: /oyigbo/i },
  { name: "Stadium Road", lat: 4.81, lng: 7.02, aliases: /stadium/i },
  { name: "Elelenwo", lat: 4.865, lng: 7.035, aliases: /elelenwo/i },
  { name: "Nkpolu", lat: 4.835, lng: 7.045, aliases: /nkpolu/i },
  { name: "Rumuepirikom", lat: 4.83, lng: 7.06, aliases: /rumuepirikom/i },
  { name: "Port Harcourt", lat: 4.8156, lng: 7.0498, aliases: /port.?harcourt|ph\b/i },
];

// Spread generic-location markers across distinct landmarks so they don't stack.
const PH_SPREAD_POINTS = [
  { name: "Port Harcourt, Aba Road area", lat: 4.81, lng: 7.03 },
  { name: "Port Harcourt, Rumuola area", lat: 4.8149, lng: 7.0426 },
  { name: "Port Harcourt, Trans-Amadi area", lat: 4.8301, lng: 7.0298 },
  { name: "Port Harcourt, Peter Odili area", lat: 4.825, lng: 7.035 },
  { name: "Port Harcourt, Rumuokoro area", lat: 4.8654, lng: 7.0222 },
  { name: "Port Harcourt, D-Line area", lat: 4.8197, lng: 7.0153 },
  { name: "Port Harcourt, Diobu area", lat: 4.7895, lng: 6.9847 },
  { name: "Port Harcourt, GRA area", lat: 4.8103, lng: 7.0073 },
  { name: "Port Harcourt, Elelenwo area", lat: 4.865, lng: 7.035 },
  { name: "Port Harcourt, Woji area", lat: 4.8392, lng: 7.0254 },
];
let spreadIndex = 0;

export function resolveLocation(text: string): { name: string; lat: number; lng: number } {
  let baseLat = 4.8156;
  let baseLng = 7.0498;
  let locName = "Port Harcourt";

  const exactMatch = PH_LOCATIONS.find((l) => l.aliases.test(text));
  if (exactMatch && exactMatch.name !== "Port Harcourt") {
    baseLat = exactMatch.lat;
    baseLng = exactMatch.lng;
    locName = exactMatch.name;
  } else {
    const point = PH_SPREAD_POINTS[spreadIndex % PH_SPREAD_POINTS.length];
    spreadIndex++;
    baseLat = point.lat;
    baseLng = point.lng;
    locName = point.name;
  }

  // ~500 m jitter so markers don't perfectly stack
  return {
    name: locName,
    lat: baseLat + (Math.random() - 0.5) * 0.008,
    lng: baseLng + (Math.random() - 0.5) * 0.008,
  };
}

/** True if the text mentions Port Harcourt / Rivers State or a known landmark. */
export function isPortHarcourtRelevant(text: string): boolean {
  return /port.?harcourt|rivers.?state|\bph\b|diobu|trans.?amadi|rumuola|rumuokoro|eleme|obio.?akpor|borokiri|oyigbo|woji|elelenwo/i.test(
    text,
  );
}

/** True if `timestamp` is within `days` of now (invalid dates are kept). */
export function isRecent(timestamp: string, days = 7): boolean {
  const t = new Date(timestamp).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= days * 86_400_000;
}

/** Strip HTML tags / common entities from an RSS description. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#?\w+;/g, " ")
    .trim();
}
