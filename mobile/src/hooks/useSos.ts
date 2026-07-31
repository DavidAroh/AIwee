/**
 * useSos — this device's own emergency: activate, live-track, and resolve.
 * Effects (alarm, keep-awake, location watch) + Supabase writes live here.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import type { Emergency, EmergencyLevel, TrackPoint } from "../lib/types";
import { createEmergency, appendTrackPoint, resolveEmergency } from "../services/backend";
import {
  ensureLocationPermission,
  getCurrentPoint,
  startAlarm,
  stopAlarm,
  watchPosition,
} from "../services/sos";

export function useSos() {
  const [active, setActive] = useState<Emergency | null>(null);
  const stopWatch = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      stopWatch.current?.();
      stopAlarm();
    },
    [],
  );

  const activate = useCallback(
    async (level: EmergencyLevel) => {
      if (active) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      await ensureLocationPermission();
      const point = await getCurrentPoint();
      const first: TrackPoint = { ...point, t: new Date().toISOString() };
      const emergency: Emergency = {
        id: `sos-${Date.now()}`,
        level,
        status: "ACTIVE",
        startedAt: new Date().toISOString(),
        track: [first],
        safeVotes: 0,
        acks: 0,
      };
      setActive(emergency);
      startAlarm(level === "SILENT");
      try {
        await createEmergency(emergency);
      } catch (e) {
        console.warn("createEmergency", e);
      }
      stopWatch.current = await watchPosition((p) => {
        const tp: TrackPoint = { ...p, t: new Date().toISOString() };
        setActive((cur) => (cur ? { ...cur, track: [...cur.track, tp] } : cur));
        appendTrackPoint(emergency.id, tp).catch(() => {});
      });
    },
    [active],
  );

  const endSos = useCallback(async () => {
    if (!active) return;
    stopWatch.current?.();
    stopWatch.current = null;
    stopAlarm();
    try {
      await resolveEmergency(active.id);
    } catch {
      /* ignore */
    }
    setActive(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [active]);

  return { active, activate, endSos };
}
