/**
 * backend — Supabase data layer for the web app.
 *
 * Maps DB rows to the app's in-memory shapes and exposes read + realtime + SOS
 * write helpers. Every function no-ops gracefully when the backend is disabled,
 * so callers can stay unconditional.
 */
import { getSupabase, isBackendEnabled } from "../lib/supabase";
import type { Incident } from "../store/useIncidentStore";
import type { Emergency, TrackPoint } from "../store/useEmergencyStore";

export { isBackendEnabled };

// ── Row → app-shape mappers ─────────────────────────────────────────────────────
export function mapIncident(r: any): Incident {
  return {
    id: r.id,
    // Legacy rows collected before the rename
    type: r.type === "Flood" ? "Natural Disaster" : r.type,
    description: r.description ?? "",
    latitude: r.latitude,
    longitude: r.longitude,
    timestamp: r.event_time ?? r.created_at ?? new Date().toISOString(),
    status: r.status ?? "UNVERIFIED",
    severityScore: r.severity ?? 5,
    confidenceScore: r.confidence ?? 60,
    summary: r.summary ?? "",
    cues: r.cues ?? [],
    corroboratingEvidence: r.corroborating_evidence ?? undefined,
    nearbyPlaces: undefined,
    mediaUrl: r.media_url ?? undefined,
    reportersCount: r.reporters_count ?? 1,
    source: r.source_kind === "citizen" ? "citizen" : "live",
  };
}

export function mapEmergency(r: any, track: TrackPoint[] = []): Emergency {
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
    resolvedAt: r.resolved_at ?? undefined,
    track: last ? (track.length ? track : [last]) : [],
    battery: r.battery ?? undefined,
    safeVotes: r.safe_votes ?? 0,
    acks: r.acks ?? 0,
    source: r.source === "sim" ? "sim" : "self",
    note: r.note ?? undefined,
    auto: r.auto ?? undefined,
  };
}

// ── Reads ────────────────────────────────────────────────────────────────────────
export async function fetchIncidents(): Promise<Incident[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("incidents")
    .select("*")
    .neq("status", "CLOSED")
    .order("event_time", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("[backend] fetchIncidents:", error.message);
    return [];
  }
  return (data ?? []).map(mapIncident);
}

export async function fetchEmergencies(): Promise<Emergency[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("emergencies")
    .select("*, emergency_track(*)")
    .eq("status", "ACTIVE")
    .order("started_at", { ascending: false });
  if (error) {
    console.warn("[backend] fetchEmergencies:", error.message);
    return [];
  }
  return (data ?? []).map((r: any) => {
    const track: TrackPoint[] = (r.emergency_track ?? [])
      .sort((a: any, b: any) => new Date(a.t).getTime() - new Date(b.t).getTime())
      .map((p: any) => ({ lat: p.lat, lng: p.lng, t: p.t, accuracy: p.accuracy, speed: p.speed }));
    return mapEmergency(r, track);
  });
}

// ── Realtime subscriptions ───────────────────────────────────────────────────────
export function subscribeIncidents(onUpsert: (inc: Incident) => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const channel = sb
    .channel("rt-incidents")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "incidents" },
      (payload) => {
        if (payload.eventType === "DELETE") return;
        onUpsert(mapIncident(payload.new));
      },
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}

export function subscribeEmergencies(
  onEmergency: (e: any) => void,
  onTrackPoint: (emergencyId: string, p: TrackPoint) => void,
): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const channel = sb
    .channel("rt-emergencies")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "emergencies" },
      (payload) => {
        if (payload.eventType !== "DELETE") onEmergency(payload.new);
      },
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "emergency_track" },
      (payload) => {
        const p = payload.new as any;
        onTrackPoint(p.emergency_id, {
          lat: p.lat,
          lng: p.lng,
          t: p.t,
          accuracy: p.accuracy,
          speed: p.speed,
        });
      },
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}

// ── SOS writes (fire-and-forget; safe when backend disabled) ─────────────────────
export async function createEmergency(e: Emergency, deviceId?: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const last = e.track[e.track.length - 1];
  await sb.from("emergencies").insert({
    id: e.id,
    level: e.level,
    status: e.status,
    started_at: e.startedAt,
    note: e.note ?? null,
    auto: e.auto ?? false,
    battery: e.battery ?? null,
    source: e.source,
    device_id: deviceId ?? null,
    last_lat: last?.lat ?? null,
    last_lng: last?.lng ?? null,
    last_accuracy: last?.accuracy ?? null,
    last_speed: last?.speed ?? null,
  });
  if (last) await appendTrackPoint(e.id, last);
}

export async function appendTrackPoint(id: string, p: TrackPoint): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("emergency_track").insert({
    emergency_id: id,
    lat: p.lat,
    lng: p.lng,
    accuracy: p.accuracy ?? null,
    speed: p.speed ?? null,
    t: p.t,
  });
}

export async function ackEmergency(id: string): Promise<void> {
  await getSupabase()?.rpc("ack_emergency", { p_id: id });
}
export async function voteSafeEmergency(id: string): Promise<void> {
  await getSupabase()?.rpc("vote_safe_emergency", { p_id: id });
}
export async function resolveEmergencyRemote(id: string): Promise<void> {
  await getSupabase()?.rpc("resolve_emergency", { p_id: id });
}
export async function confirmIncidentRemote(id: string, confirmed: boolean): Promise<void> {
  await getSupabase()?.rpc("confirm_incident", { p_id: id, p_confirmed: confirmed });
}

/** Submit a citizen report through the `report` Edge Function. */
export async function submitReport(payload: {
  description: string;
  quickType?: string;
  latitude?: number;
  longitude?: number;
}): Promise<Incident | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.functions.invoke("report", { body: payload });
  if (error) {
    console.warn("[backend] submitReport:", error.message);
    return null;
  }
  return data?.incident ? mapIncident(data.incident) : null;
}
