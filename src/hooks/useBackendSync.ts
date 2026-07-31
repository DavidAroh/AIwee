/**
 * useBackendSync — when Supabase is configured, hydrate the stores from the
 * backend and keep them live via Realtime. No-ops entirely when the backend is
 * disabled (the app then uses client-side collection as before).
 *
 * Mount once per app shell (Citizen layout, Control Room).
 */
import { useEffect } from "react";
import { useIncidentStore } from "../store/useIncidentStore";
import { useEmergencyStore } from "../store/useEmergencyStore";
import {
  isBackendEnabled,
  fetchIncidents,
  fetchEmergencies,
  subscribeIncidents,
  subscribeEmergencies,
  mapEmergency,
} from "../services/backend";

export function useBackendSync() {
  useEffect(() => {
    if (!isBackendEnabled()) return;

    const incidentStore = useIncidentStore.getState();
    const emergencyStore = useEmergencyStore.getState();
    let cancelled = false;

    // Initial hydration
    fetchIncidents().then((list) => {
      if (cancelled) return;
      for (const inc of list) incidentStore.upsertIncident(inc);
    });
    fetchEmergencies().then((list) => {
      if (cancelled) return;
      for (const e of list) emergencyStore.upsertRemoteEmergency(e);
    });

    // Live updates
    const unsubIncidents = subscribeIncidents((inc) =>
      useIncidentStore.getState().upsertIncident(inc),
    );
    const unsubEmergencies = subscribeEmergencies(
      (row) => useEmergencyStore.getState().upsertRemoteEmergency(mapEmergency(row)),
      (id, point) => useEmergencyStore.getState().applyRemoteTrackPoint(id, point),
    );

    return () => {
      cancelled = true;
      unsubIncidents();
      unsubEmergencies();
    };
  }, []);
}
