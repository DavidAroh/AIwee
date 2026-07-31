export type IncidentType =
  | "Fire" | "Accident" | "Crime" | "Medical" | "Natural Disaster" | "Other";

export interface Incident {
  id: string;
  type: IncidentType;
  description: string;
  summary: string;
  locationName: string;
  latitude: number;
  longitude: number;
  severity: number;
  confidence: number;
  status: string;
  reportersCount: number;
  sourceKind: "news" | "social" | "citizen" | "ai";
  outlet?: string | null;
  url?: string | null;
  cues: string[];
  eventTime: string;
}

export type EmergencyLevel =
  | "THREAT" | "MEDICAL" | "KIDNAP" | "VIOLENCE" | "SILENT";

export const LEVEL_META: Record<EmergencyLevel, { label: string; phrase: string; emoji: string }> = {
  THREAT: { label: "Personal Threat", phrase: "I'm being followed.", emoji: "⚠️" },
  MEDICAL: { label: "Medical Emergency", phrase: "I need immediate medical help.", emoji: "🏥" },
  KIDNAP: { label: "Kidnapping", phrase: "I'm being taken against my will.", emoji: "🚨" },
  VIOLENCE: { label: "Violence", phrase: "I'm under attack.", emoji: "🆘" },
  SILENT: { label: "Silent SOS", phrase: "Location only — no siren.", emoji: "🤫" },
};

export interface TrackPoint {
  lat: number;
  lng: number;
  t: string;
  accuracy?: number | null;
  speed?: number | null;
}

export interface Emergency {
  id: string;
  level: EmergencyLevel;
  status: "ACTIVE" | "RESOLVED";
  startedAt: string;
  track: TrackPoint[];
  battery?: number | null;
  safeVotes: number;
  acks: number;
  note?: string | null;
}

export function mapEmergencyRow(r: any, track: TrackPoint[] = []): Emergency {
  const last: TrackPoint | undefined =
    track[track.length - 1] ??
    (typeof r.last_lat === "number"
      ? { lat: r.last_lat, lng: r.last_lng, t: r.started_at, accuracy: r.last_accuracy, speed: r.last_speed }
      : undefined);
  return {
    id: r.id,
    level: r.level,
    status: r.status,
    startedAt: r.started_at,
    track: last ? (track.length ? track : [last]) : [],
    battery: r.battery ?? undefined,
    safeVotes: r.safe_votes ?? 0,
    acks: r.acks ?? 0,
    note: r.note ?? undefined,
  };
}

export function mapIncidentRow(r: any): Incident {
  return {
    id: r.id,
    // Legacy rows collected before the rename
    type: r.type === "Flood" ? "Natural Disaster" : r.type,
    description: r.description ?? "",
    summary: r.summary ?? "",
    locationName: r.location_name ?? "Port Harcourt",
    latitude: r.latitude,
    longitude: r.longitude,
    severity: r.severity ?? 5,
    confidence: r.confidence ?? 60,
    status: r.status ?? "UNVERIFIED",
    reportersCount: r.reporters_count ?? 1,
    sourceKind: r.source_kind ?? "news",
    outlet: r.outlet,
    url: r.url,
    cues: r.cues ?? [],
    eventTime: r.event_time ?? r.created_at ?? new Date().toISOString(),
  };
}
