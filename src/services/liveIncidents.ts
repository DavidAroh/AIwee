/**
 * Live Incident Service — Dual-source: Google News RSS + Gemini Search grounding
 *
 * Pipeline:
 *  1. Google News RSS (real PH headlines, no API key, via CORS proxy) — fastest
 *  2. Gemini 2.0 Flash with googleSearch grounding — AI-structured incidents
 *  Both run in PARALLEL; results are merged & deduplicated.
 *  Falls back to curated PH pool only when BOTH sources fail.
 */
import { GoogleGenAI, Type } from '@google/genai';
import { fetchGoogleNewsIncidents } from './googleNewsRSS';

// ── Client ─────────────────────────────────────────────────────────────────────
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// ── Types ──────────────────────────────────────────────────────────────────────
export interface LiveIncident {
  id: string;
  type: 'Fire' | 'Accident' | 'Crime' | 'Medical' | 'Flood' | 'Other';
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  severity: number;
  summary: string;
  cues: string[];
  source: 'live';
  timestamp: string;
  confidenceScore?: number;
  corroboratingEvidence?: string[];
}

// ── Coordinate clamp — keeps everything inside Port Harcourt bbox ─────────────
const clampLat = (v: number) => Math.max(4.70, Math.min(4.95, v));
const clampLng = (v: number) => Math.max(6.90, Math.min(7.18, v));

// ── Known PH location coordinates ─────────────────────────────────────────────
const PH_COORDS: Record<string, [number, number]> = {
  'Diobu Market':          [4.7895, 6.9847],
  'Diobu':                 [4.7900, 6.9850],
  'Trans-Amadi':           [4.8301, 7.0298],
  'Mile 1 Market':         [4.8002, 6.9751],
  'Mile 1':                [4.8002, 6.9751],
  'D-Line':                [4.8197, 7.0153],
  'Rumuola Road':          [4.8149, 7.0426],
  'Rumuigbo Junction':     [4.8296, 6.9899],
  'Rumuigbo':              [4.8296, 6.9899],
  'Woji Road':             [4.8392, 7.0254],
  'Woji':                  [4.8392, 7.0254],
  'Eleme Junction':        [4.7732, 7.0905],
  'Eleme':                 [4.7732, 7.0905],
  'GRA Phase 1':           [4.8103, 7.0073],
  'GRA':                   [4.8103, 7.0073],
  'Borokiri':              [4.7605, 7.0049],
  'Eagle Island':          [4.7800, 6.9900],
  'Peter Odili Road':      [4.8250, 7.0350],
  'Peter Odili':           [4.8250, 7.0350],
  'Aba Road':              [4.8100, 7.0300],
  'Rumuokoro':             [4.8654, 7.0222],
  'Rumuokoro Roundabout':  [4.8654, 7.0222],
  'Rumuola':               [4.8149, 7.0426],
  'Alesa':                 [4.8050, 7.0550],
  'Oyigbo':                [4.7450, 7.1400],
  'Ogoni':                 [4.7200, 7.0900],
  'Rumuepirikom':          [4.8300, 7.0600],
  'Old GRA':               [4.8180, 7.0200],
  'New GRA':               [4.8050, 7.0400],
  'Stadium Road':          [4.8100, 7.0200],
  'Nkpolu':                [4.8350, 7.0450],
  'Elelenwo':              [4.8650, 7.0350],
  'Mgbuoba':               [4.8800, 7.0300],
};

function resolveCoords(locationName: string): [number, number] {
  let baseLat = 4.8156;
  let baseLng = 7.0498;

  // Exact match first
  if (PH_COORDS[locationName]) {
    [baseLat, baseLng] = PH_COORDS[locationName];
  } else {
    // Partial match
    const lower = locationName.toLowerCase();
    let found = false;
    for (const [key, coords] of Object.entries(PH_COORDS)) {
      if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
        [baseLat, baseLng] = coords;
        found = true;
        break;
      }
    }
    
    // If not found, it keeps the default PH coords but with a larger jitter
    if (!found) {
      return [
        baseLat + (Math.random() - 0.5) * 0.05,
        baseLng + (Math.random() - 0.5) * 0.05,
      ];
    }
  }

  // ALWAYS apply a small jitter (~500m) to exact/partial matches so markers don't stack perfectly
  return [
    baseLat + (Math.random() - 0.5) * 0.008,
    baseLng + (Math.random() - 0.5) * 0.008,
  ];
}

// ── Curated fallback (used when Gemini API unavailable) ────────────────────────
const PH_FALLBACK: Omit<LiveIncident, 'id' | 'timestamp' | 'source'>[] = [
  {
    type: 'Fire',
    description: 'Electrical fire at Diobu Market — multiple stalls affected, Fire Service responding.',
    locationName: 'Diobu Market',
    latitude: 4.7895, longitude: 6.9847,
    severity: 9,
    summary: 'Electrical fire spreading through Diobu Market stalls — immediate fire-service response required.',
    cues: ['market fire', 'flames visible', 'electrical fault', 'Diobu'],
    confidenceScore: 82,
  },
  {
    type: 'Accident',
    description: 'Triple-vehicle collision on Aba Road causing gridlock. One occupant trapped inside vehicle.',
    locationName: 'Aba Road Junction',
    latitude: 4.8100, longitude: 7.0300,
    severity: 8,
    summary: 'Multi-vehicle collision on Aba Road — two lanes blocked, rescue team needed urgently.',
    cues: ['road blocked', 'trapped occupant', 'airbag deployed', 'Aba Road'],
    confidenceScore: 74,
  },
  {
    type: 'Flood',
    description: 'Flash flooding at Rumuigbo junction — water level over 40 cm, road completely impassable.',
    locationName: 'Rumuigbo Junction',
    latitude: 4.8296, longitude: 6.9899,
    severity: 7,
    summary: 'Flash flooding at Rumuigbo consistent with heavy rainfall — drivers advised to avoid area.',
    cues: ['water rising', 'road impassable', 'drainage blocked', 'Rumuigbo'],
    confidenceScore: 90,
  },
  {
    type: 'Medical',
    description: 'Cardiac arrest at a bus stop on Peter Odili Road. Bystanders performing CPR.',
    locationName: 'Peter Odili Road',
    latitude: 4.8250, longitude: 7.0350,
    severity: 10,
    summary: 'Critical cardiac arrest — Peter Odili Road bus stop, ambulance dispatch critical priority.',
    cues: ['cardiac arrest', 'CPR underway', 'bus stop', 'urgent dispatch'],
    confidenceScore: 86,
  },
  {
    type: 'Crime',
    description: 'Armed robbery at POS/ATM kiosk in Trans-Amadi. Suspects fled toward Mile 3.',
    locationName: 'Trans-Amadi',
    latitude: 4.8301, longitude: 7.0298,
    severity: 8,
    summary: 'Armed robbery at Trans-Amadi ATM kiosk — suspects at large, police alerted.',
    cues: ['armed robbery', 'ATM', 'suspects fled', 'Trans-Amadi'],
    confidenceScore: 65,
  },
  {
    type: 'Flood',
    description: 'Tidal surge affecting Eagle Island waterfront — road submerged, households at risk.',
    locationName: 'Eagle Island',
    latitude: 4.7800, longitude: 6.9900,
    severity: 6,
    summary: 'Tidal surge at Eagle Island — residents advised to move valuables to higher floors.',
    cues: ['tidal surge', 'waterfront', 'evacuation advisory', 'Eagle Island'],
    confidenceScore: 88,
  },
  {
    type: 'Other',
    description: 'Gas pipeline leak in Borokiri residential area. Strong odour reported across neighbourhood.',
    locationName: 'Borokiri',
    latitude: 4.7605, longitude: 7.0049,
    severity: 7,
    summary: 'Gas leak in Borokiri — SPDC alerted, residents advised to evacuate and avoid open flames.',
    cues: ['gas smell', 'pipeline leak', 'residential', 'Borokiri'],
    confidenceScore: 93,
  },
];

// ── Response schema for Gemini structured output ───────────────────────────────
const INCIDENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    incidents: {
      type: Type.ARRAY,
      description: 'List of 5–7 current public safety incidents in Port Harcourt',
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description: 'One of: Fire, Accident, Crime, Medical, Flood, Other',
          },
          description: {
            type: Type.STRING,
            description: 'Detailed 1–2 sentence description sourced from real news or typical pattern',
          },
          locationName: {
            type: Type.STRING,
            description: 'Specific Port Harcourt neighbourhood or landmark (e.g. "Diobu Market", "Trans-Amadi")',
          },
          severity: {
            type: Type.NUMBER,
            description: 'Severity 1 (minor) to 10 (catastrophic)',
          },
          summary: {
            type: Type.STRING,
            description: 'One-sentence AI operator summary',
          },
          cues: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Up to 5 keyword tags',
          },
          confidenceScore: {
            type: Type.NUMBER,
            description: 'Confidence 0–100: 90+ if from real news, 60–80 if typical pattern, <60 if speculative',
          },
          groundingSource: {
            type: Type.STRING,
            description: 'Brief mention of the news source if grounded, or "pattern-based" if not',
          },
        },
        required: ['type', 'description', 'locationName', 'severity', 'summary', 'cues', 'confidenceScore'],
      },
    },
  },
  required: ['incidents'],
};

// ── Deduplication: same type within ~500m radius ──────────────────────────────
function isDuplicate(candidate: LiveIncident, existing: LiveIncident[]): boolean {
  return existing.some(
    (e) =>
      e.type === candidate.type &&
      Math.abs(e.latitude  - candidate.latitude)  < 0.005 &&
      Math.abs(e.longitude - candidate.longitude) < 0.005,
  );
}

// ── Main fetch function ────────────────────────────────────────────────────────
export async function fetchLivePortHarcourtIncidents(): Promise<LiveIncident[]> {
  const now = new Date().toISOString();
  const dateStr = new Date().toLocaleDateString('en-NG', {
    timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('en-NG', {
    timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit',
  }) + ' WAT';

  // ── Run BOTH sources in parallel ─────────────────────────────────────────────
  const [rssResult, geminiResult] = await Promise.allSettled([
    // Source 1: Google News RSS — zero API key, real headlines
    fetchGoogleNewsIncidents(),

    // Source 2: Gemini + Google Search grounding — AI-structured incidents
    (async (): Promise<LiveIncident[]> => {
      const searchResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Search Google for the latest public safety incidents in Port Harcourt, Rivers State, Nigeria as of ${dateStr}.

Look for recent news about:
- Road accidents, vehicle collisions on Port Harcourt roads (Aba Road, Peter Odili Road, Trans-Amadi, Eleme Junction, Rumuola Road)
- Fire outbreaks (markets: Diobu, Mile 1, Rumuola; industrial areas)
- Flooding events (Eagle Island, Borokiri, Rumuigbo, D-Line)
- Crime incidents (robberies, kidnappings, clashes in Port Harcourt)
- Medical emergencies reported in Port Harcourt
- Environmental hazards (gas leaks, oil spills in Rivers State)

Summarize what you find from real news sources. Include specific locations, severity, and times if available.`,
        config: { tools: [{ googleSearch: {} }] },
      });

      const groundedText    = searchResponse.text ?? '';
      const groundingChunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sourceSummary   = groundingChunks.slice(0, 5).map((c: any) => c.web?.title ?? '').filter(Boolean).join('; ');

      const structureResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `You are the AiWee incident structuring engine for Port Harcourt, Rivers State, Nigeria.

Based on this Google-grounded news summary:
"""
${groundedText}
"""

News sources found: ${sourceSummary || 'none — use realistic Port Harcourt pattern data'}
Current time: ${timeStr}, ${dateStr}

Generate between 5 and 7 public safety incidents for the AiWee map.

RULES:
1. If real news was found, base incidents on it (high confidence 80–95)
2. If no real news, generate realistic pattern-based incidents typical for Port Harcourt (confidence 55–75)
3. Use ONLY real Port Harcourt neighbourhood names as locationName
4. Vary severity: include some minor (1–4), some moderate (5–7), some critical (8–10)
5. Be specific: use route names, market names, junction names in descriptions
6. Include 3–5 keyword cues per incident

Key Port Harcourt locations to use:
Diobu Market (4.7895, 6.9847), Trans-Amadi (4.8301, 7.0298), Mile 1 Market (4.8002, 6.9751),
D-Line (4.8197, 7.0153), Rumuola Road (4.8149, 7.0426), Rumuigbo Junction (4.8296, 6.9899),
Woji Road (4.8392, 7.0254), Eleme Junction (4.7732, 7.0905), GRA Phase 1 (4.8103, 7.0073),
Borokiri (4.7605, 7.0049), Eagle Island (4.7800, 6.9900), Peter Odili Road (4.8250, 7.0350),
Aba Road (4.8100, 7.0300), Rumuokoro (4.8654, 7.0222)`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: INCIDENT_SCHEMA,
        },
      });

      const parsed = JSON.parse(structureResponse.text ?? '{}') as { incidents: any[] };
      if (!Array.isArray(parsed.incidents) || parsed.incidents.length === 0) {
        throw new Error('Gemini returned no incidents');
      }

      return parsed.incidents.slice(0, 8).map((item, i) => {
        const [lat, lng] = resolveCoords(item.locationName ?? 'Port Harcourt');
        return {
          id:              `live-gemini-${Date.now()}-${i}`,
          type:            (['Fire','Accident','Crime','Medical','Flood','Other'].includes(item.type) ? item.type : 'Other') as LiveIncident['type'],
          description:     String(item.description ?? ''),
          locationName:    String(item.locationName ?? 'Port Harcourt'),
          latitude:        clampLat(lat),
          longitude:       clampLng(lng),
          severity:        Math.max(1, Math.min(10, Number(item.severity) || 5)),
          summary:         String(item.summary ?? item.description ?? ''),
          cues:            Array.isArray(item.cues) ? (item.cues as string[]).slice(0, 5) : [],
          confidenceScore: Math.max(0, Math.min(100, Number(item.confidenceScore) || 70)),
          corroboratingEvidence: groundingChunks
            .slice(0, 3)
            .map((c: any) => c.web?.title && c.web?.uri ? `${c.web.title} — ${c.web.uri}` : null)
            .filter(Boolean) as string[],
          source:    'live' as const,
          timestamp: now,
        };
      });
    })(),
  ]);

  const rssIncidents    = rssResult.status    === 'fulfilled' ? rssResult.value    : [];
  const geminiIncidents = geminiResult.status === 'fulfilled' ? geminiResult.value : [];

  if (rssResult.status    === 'rejected') console.info(`[AiWee/RSS] unavailable: ${(rssResult.reason as any)?.message ?? 'proxy error'}`);
  if (geminiResult.status === 'rejected') {
    const err = geminiResult.reason as any;
    if (err?.status === 429 || err?.message?.includes('quota') || err?.message?.includes('RESOURCE_EXHAUSTED'))
      console.info('[AiWee/Gemini] rate limited — RSS-only mode active');
    else if (err?.status === 503 || err?.message?.includes('UNAVAILABLE'))
      console.info('[AiWee/Gemini] temporarily unavailable — RSS-only mode active');
    else if (err?.status === 403 || err?.message?.includes('key') || err?.message?.includes('PERMISSION_DENIED'))
      console.warn('[AiWee/Gemini] API key invalid — add VITE_GEMINI_API_KEY to .env');
    else
      console.warn('[AiWee/Gemini]', err?.message ?? err);
  }

  // ── Merge: RSS (real headlines) first, then fill with Gemini ─────────────────
  const merged: LiveIncident[] = [];

  for (const inc of rssIncidents) {
    if (!isDuplicate(inc, merged)) merged.push(inc);
  }
  for (const inc of geminiIncidents) {
    if (!isDuplicate(inc, merged)) merged.push(inc);
  }

  if (merged.length > 0) {
    console.log(`[AiWee] ${merged.length} live incidents (${rssIncidents.length} RSS + ${geminiIncidents.length} Gemini)`);
    return merged.slice(0, 10);
  }

  // ── Both failed — curated fallback ───────────────────────────────────────────
  console.info('[AiWee] Both sources unavailable — using curated Port Harcourt data');
  const shuffled = [...PH_FALLBACK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5).map((inc, i) => ({
    ...inc,
    id:        `live-fallback-${Date.now()}-${i}`,
    source:    'live' as const,
    timestamp: now,
  }));
}


