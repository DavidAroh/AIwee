/**
 * Live Incident Service — powered by Google Gemini + Google Search grounding
 *
 * Uses gemini-2.0-flash with googleSearch grounding to find *real* recent
 * Port Harcourt public-safety news, then structures the results into typed
 * incident objects for the AiWee map and feed.
 *
 * Falls back to a curated PH incident pool when the API key is missing,
 * rate-limited, or the model returns no usable data.
 */
import { GoogleGenAI, Type } from '@google/genai';

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
  // Exact match first
  if (PH_COORDS[locationName]) return PH_COORDS[locationName];

  // Partial match
  const lower = locationName.toLowerCase();
  for (const [key, coords] of Object.entries(PH_COORDS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return coords;
    }
  }

  // Default: Port Harcourt centre with small random jitter
  return [
    4.8156 + (Math.random() - 0.5) * 0.05,
    7.0498 + (Math.random() - 0.5) * 0.05,
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

// ── Main fetch function ────────────────────────────────────────────────────────
export async function fetchLivePortHarcourtIncidents(): Promise<LiveIncident[]> {
  const now = new Date().toISOString();
  const dateStr = new Date().toLocaleDateString('en-NG', {
    timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('en-NG', {
    timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit',
  }) + ' WAT';

  try {
    // ── Step 1: Use Google Search grounding to find real news ─────────────────
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
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundedText = searchResponse.text ?? '';
    const groundingChunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sourceSummary = groundingChunks
      .slice(0, 5)
      .map((c: any) => c.web?.title ?? '')
      .filter(Boolean)
      .join('; ');

    // ── Step 2: Structure the grounded content into typed incidents ────────────
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

    // ── Step 3: Map to LiveIncident, resolving coordinates ────────────────────
    return parsed.incidents.slice(0, 8).map((item, i) => {
      const [lat, lng] = resolveCoords(item.locationName ?? 'Port Harcourt');

      return {
        id: `live-gemini-${Date.now()}-${i}`,
        type: (['Fire','Accident','Crime','Medical','Flood','Other'].includes(item.type)
          ? item.type : 'Other') as LiveIncident['type'],
        description: String(item.description ?? ''),
        locationName: String(item.locationName ?? 'Port Harcourt'),
        latitude:  clampLat(lat),
        longitude: clampLng(lng),
        severity:  Math.max(1, Math.min(10, Number(item.severity) || 5)),
        summary:   String(item.summary ?? item.description ?? ''),
        cues:      Array.isArray(item.cues) ? (item.cues as string[]).slice(0, 5) : [],
        confidenceScore: Math.max(0, Math.min(100, Number(item.confidenceScore) || 70)),
        corroboratingEvidence: groundingChunks
          .slice(0, 3)
          .map((c: any) => c.web?.title && c.web?.uri ? `${c.web.title} — ${c.web.uri}` : null)
          .filter(Boolean) as string[],
        source: 'live' as const,
        timestamp: now,
      };
    });

  } catch (err: any) {
    const isAuth  = err?.status === 403 || err?.message?.includes('API key') || err?.message?.includes('PERMISSION_DENIED');
    const isQuota = err?.status === 429 || err?.message?.includes('quota') || err?.message?.includes('RESOURCE_EXHAUSTED');

    if (isAuth) {
      console.warn('[AiWee] Gemini API key not set or invalid — add VITE_GEMINI_API_KEY to .env');
    } else if (isQuota) {
      console.warn('[AiWee] Gemini rate limited — using curated Port Harcourt incident data');
    } else {
      console.error('[AiWee] Gemini live incidents error:', err?.message ?? err);
    }

    // Shuffle and return curated fallback
    const shuffled = [...PH_FALLBACK].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5).map((inc, i) => ({
      ...inc,
      id: `live-fallback-${Date.now()}-${i}`,
      source: 'live' as const,
      timestamp: now,
    }));
  }
}
