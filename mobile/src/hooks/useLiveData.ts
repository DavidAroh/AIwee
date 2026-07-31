/**
 * useLiveData — single source of live state for the app (Feed + Map share it).
 * Hydrates incidents + active emergencies from Supabase and keeps both live via
 * Realtime.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Emergency, Incident, TrackPoint } from "../lib/types";
import {
  fetchIncidents,
  subscribeIncidents,
  fetchActiveEmergencies,
  subscribeEmergencies,
} from "../services/backend";

export function useLiveData() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const [inc, em] = await Promise.all([fetchIncidents(), fetchActiveEmergencies()]);
      if (!mounted.current) return;
      setIncidents(inc);
      setEmergencies(em);
    } catch (e) {
      console.warn("[useLiveData]", e);
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  useEffect(() => {
    mounted.current = true;
    load();

    const upsertIncident = (inc: Incident) =>
      setIncidents((list) => {
        const i = list.findIndex((x) => x.id === inc.id);
        if (i === -1) return [inc, ...list];
        const next = list.slice();
        next[i] = inc;
        return next;
      });

    const upsertEmergency = (e: Emergency) =>
      setEmergencies((list) => {
        const i = list.findIndex((x) => x.id === e.id);
        if (e.status !== "ACTIVE") return list.filter((x) => x.id !== e.id);
        if (i === -1) return [e, ...list];
        const next = list.slice();
        const keepTrack = next[i].track.length >= e.track.length ? next[i].track : e.track;
        next[i] = { ...next[i], ...e, track: keepTrack };
        return next;
      });

    const appendTrack = (id: string, p: TrackPoint) =>
      setEmergencies((list) =>
        list.map((e) =>
          e.id === id && e.status === "ACTIVE"
            ? { ...e, track: [...e.track.slice(-199), p] }
            : e,
        ),
      );

    const unsubInc = subscribeIncidents(upsertIncident);
    const unsubEm = subscribeEmergencies(upsertEmergency, appendTrack);

    return () => {
      mounted.current = false;
      unsubInc();
      unsubEm();
    };
  }, [load]);

  return { incidents, emergencies, loading, refreshing, refresh };
}
