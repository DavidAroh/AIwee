/**
 * backend — mobile data layer (Supabase). Live incidents + SOS, shared with the
 * web app through the same tables.
 */
import { getSupabase } from "../lib/supabase";
import {
  mapEmergencyRow,
  mapIncidentRow,
  type Emergency,
  type Incident,
  type TrackPoint,
} from "../lib/types";

export async function fetchIncidents(): Promise<Incident[]> {
  const { data, error } = await getSupabase()
    .from("incidents")
    .select("*")
    .neq("status", "CLOSED")
    .order("event_time", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(mapIncidentRow);
}

export function subscribeIncidents(onUpsert: (i: Incident) => void): () => void {
  const sb = getSupabase();
  const channel = sb
    .channel("rt-incidents")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "incidents" },
      (payload) => {
        if (payload.eventType !== "DELETE") onUpsert(mapIncidentRow(payload.new));
      },
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}

export async function fetchActiveEmergencies(): Promise<Emergency[]> {
  const { data, error } = await getSupabase()
    .from("emergencies")
    .select("*, emergency_track(*)")
    .eq("status", "ACTIVE")
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => {
    const track: TrackPoint[] = (r.emergency_track ?? [])
      .sort((a: any, b: any) => new Date(a.t).getTime() - new Date(b.t).getTime())
      .map((p: any) => ({ lat: p.lat, lng: p.lng, t: p.t, accuracy: p.accuracy, speed: p.speed }));
    return mapEmergencyRow(r, track);
  });
}

export function subscribeEmergencies(
  onEmergency: (e: Emergency) => void,
  onTrackPoint: (emergencyId: string, p: TrackPoint) => void,
): () => void {
  const sb = getSupabase();
  const channel = sb
    .channel("rt-emergencies")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "emergencies" },
      (payload) => {
        if (payload.eventType !== "DELETE") onEmergency(mapEmergencyRow(payload.new));
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

export async function createEmergency(e: Emergency, deviceId?: string): Promise<void> {
  const last = e.track[e.track.length - 1];
  const sb = getSupabase();
  await sb.from("emergencies").insert({
    id: e.id,
    level: e.level,
    status: e.status,
    started_at: e.startedAt,
    note: e.note ?? null,
    battery: e.battery ?? null,
    source: "self",
    device_id: deviceId ?? null,
    last_lat: last?.lat ?? null,
    last_lng: last?.lng ?? null,
    last_accuracy: last?.accuracy ?? null,
    last_speed: last?.speed ?? null,
  });
  if (last) await appendTrackPoint(e.id, last);
}

export async function appendTrackPoint(id: string, p: TrackPoint): Promise<void> {
  await getSupabase().from("emergency_track").insert({
    emergency_id: id,
    lat: p.lat,
    lng: p.lng,
    accuracy: p.accuracy ?? null,
    speed: p.speed ?? null,
    t: p.t,
  });
}

export async function resolveEmergency(id: string): Promise<void> {
  await getSupabase().rpc("resolve_emergency", { p_id: id });
}

/** Crowd verification — a citizen confirms (or denies) an unverified incident. */
export async function confirmIncident(id: string, confirmed: boolean): Promise<void> {
  await getSupabase().rpc("confirm_incident", { p_id: id, p_confirmed: confirmed });
}

export async function submitReport(payload: {
  description: string;
  quickType?: string;
  latitude?: number;
  longitude?: number;
}): Promise<Incident | null> {
  const { data, error } = await getSupabase().functions.invoke("report", { body: payload });
  if (error) throw error;
  return data?.incident ? mapIncidentRow(data.incident) : null;
}
