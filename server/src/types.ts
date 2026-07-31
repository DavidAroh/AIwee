export type IncidentType =
  | "Fire"
  | "Accident"
  | "Crime"
  | "Medical"
  | "Flood"
  | "Other";

export type SourceKind = "news" | "social" | "citizen";

export interface Incident {
  id: string;
  type: IncidentType;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  severity: number;
  summary: string;
  cues: string[];
  confidenceScore: number;
  corroboratingEvidence?: string[];
  sourceKind: SourceKind;
  outlet?: string;
  url?: string;
  timestamp: string; // ISO
}

export type EmergencyLevel =
  | "THREAT"
  | "MEDICAL"
  | "KIDNAP"
  | "VIOLENCE"
  | "SILENT";

export interface TrackPoint {
  lat: number;
  lng: number;
  t: string;
  accuracy?: number;
  speed?: number | null;
}

export interface Emergency {
  id: string;
  level: EmergencyLevel;
  status: "ACTIVE" | "RESOLVED";
  startedAt: string;
  resolvedAt?: string;
  track: TrackPoint[];
  battery?: number;
  safeVotes: number;
  acks: number;
  note?: string;
  auto?: boolean;
  deviceId?: string;
}

/** Server-Sent Event envelope pushed to all connected clients. */
export type ServerEvent =
  | { type: "snapshot"; incidents: Incident[]; emergencies: Emergency[] }
  | { type: "incidents"; incidents: Incident[] } // newly added
  | { type: "emergency"; emergency: Emergency }
  | { type: "emergency-update"; emergency: Emergency };
