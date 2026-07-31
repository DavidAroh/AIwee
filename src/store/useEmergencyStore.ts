/**
 * useEmergencyStore — Personal Emergency Alert (SOS) state.
 *
 * Person-centric emergencies, separate from crowd-sourced incidents: the
 * emergency is happening TO the user. Holds the device's own active SOS, the
 * safety (dead-man's-switch) timer, and the list of emergencies the Control
 * Room manages.
 *
 * The active SOS and safety timer persist to localStorage so a page reload
 * doesn't silently kill an emergency. GPS streams via watchPosition into the
 * emergency's track for live-trail display.
 */
import { create } from "zustand";
import { useIncidentStore } from "./useIncidentStore";
import {
  startSiren,
  stopSiren,
  startVibration,
  stopVibration,
} from "../services/sosEffects";
import {
  isBackendEnabled,
  createEmergency as backendCreate,
  appendTrackPoint as backendTrack,
  ackEmergency as backendAck,
  voteSafeEmergency as backendVoteSafe,
  resolveEmergencyRemote,
} from "../services/backend";

export type EmergencyLevel =
  | "THREAT"
  | "MEDICAL"
  | "KIDNAP"
  | "VIOLENCE"
  | "SILENT";

export const LEVEL_META: Record<
  EmergencyLevel,
  { label: string; phrase: string; emoji: string }
> = {
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
  /** 'self' = this device's SOS; 'sim' = control-room simulation */
  source: "self" | "sim";
  note?: string;
  /** true when triggered automatically by an expired safety timer */
  auto?: boolean;
}

export interface SafetyTimer {
  deadline: number; // epoch ms
  durationMin: number;
  note?: string;
}

const SOS_KEY = "aiwee_sos_active";
const TIMER_KEY = "aiwee_safety_timer";
const PH_DEFAULT: [number, number] = [4.8156, 7.0498];

// ── Persistence helpers ────────────────────────────────────────────────────────
function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

// ── Module-level runtime handles (not serializable state) ─────────────────────
let gpsWatchId: number | null = null;
let simDriftTimer: ReturnType<typeof setInterval> | null = null;

function stopGpsWatch(): void {
  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
  }
}

interface EmergencyStore {
  emergencies: Emergency[];
  /** id of this device's own active SOS, if any */
  activeId: string | null;
  safetyTimer: SafetyTimer | null;

  activateSos: (level: EmergencyLevel, opts?: { auto?: boolean; note?: string }) => void;
  /** User-side "I'm Safe" — resolves own emergency and stops all effects. */
  markSafe: () => void;
  /** Operator-side resolution from the Control Room. */
  resolveEmergency: (id: string) => void;
  acknowledge: (id: string) => void;
  voteSafe: (id: string) => void;

  startSafetyTimer: (durationMin: number, note?: string) => void;
  cancelSafetyTimer: () => void;
  /** Called on an interval; fires auto-SOS when the timer expires. */
  checkSafetyTimer: () => void;

  /** Control-room demo: spawn a simulated moving emergency. */
  simulateEmergency: () => void;

  // ── Realtime (Supabase) merge helpers ──────────────────────────────────────
  /** Insert/update an emergency received from the backend (other devices). */
  upsertRemoteEmergency: (e: Emergency) => void;
  /** Append a GPS point streamed from the backend (skips this device's own). */
  applyRemoteTrackPoint: (emergencyId: string, p: TrackPoint) => void;
}

export const useEmergencyStore = create<EmergencyStore>((set, get) => {
  // ── Restore persisted state (page reload during an emergency) ───────────────
  const persisted = loadJson<Emergency>(SOS_KEY);
  const persistedTimer = loadJson<SafetyTimer>(TIMER_KEY);
  const restored: Emergency[] = persisted && persisted.status === "ACTIVE" ? [persisted] : [];

  const appendTrack = (id: string, point: TrackPoint) => {
    set((s) => ({
      emergencies: s.emergencies.map((e) => {
        if (e.id !== id || e.status !== "ACTIVE") return e;
        const updated = { ...e, track: [...e.track.slice(-199), point] };
        if (id === s.activeId) saveJson(SOS_KEY, updated);
        return updated;
      }),
    }));
    // Stream this device's own points to the backend for live cross-device tracking.
    if (id === get().activeId && isBackendEnabled()) backendTrack(id, point);
  };

  const startGpsWatch = (id: string) => {
    stopGpsWatch();
    if (!("geolocation" in navigator)) return;
    gpsWatchId = navigator.geolocation.watchPosition(
      (pos) =>
        appendTrack(id, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          t: new Date().toISOString(),
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
        }),
      () => {
        /* denied/unavailable — keep the default point already in the track */
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
  };

  // Resume GPS streaming for a restored emergency (siren cannot auto-resume —
  // browser autoplay policy requires a fresh tap; the overlay offers one).
  if (restored.length > 0) {
    setTimeout(() => startGpsWatch(restored[0].id), 0);
  }

  const readBattery = (id: string) => {
    const nav = navigator as any;
    nav.getBattery?.().then((b: { level: number }) => {
      set((s) => ({
        emergencies: s.emergencies.map((e) =>
          e.id === id ? { ...e, battery: Math.round(b.level * 100) } : e,
        ),
      }));
    });
  };

  return {
    emergencies: restored,
    activeId: restored[0]?.id ?? null,
    safetyTimer: persistedTimer,

    activateSos: (level, opts = {}) => {
      if (get().activeId) return; // one active SOS per device

      const id = `sos-${Date.now()}`;
      const silent = level === "SILENT";
      const emergency: Emergency = {
        id,
        level,
        status: "ACTIVE",
        startedAt: new Date().toISOString(),
        track: [
          { lat: PH_DEFAULT[0], lng: PH_DEFAULT[1], t: new Date().toISOString() },
        ],
        safeVotes: 0,
        acks: 0,
        source: "self",
        note: opts.note,
        auto: opts.auto,
      };

      set((s) => ({
        emergencies: [emergency, ...s.emergencies],
        activeId: id,
        // an SOS supersedes any pending safety timer
        safetyTimer: null,
      }));
      saveJson(SOS_KEY, emergency);
      localStorage.removeItem(TIMER_KEY);

      if (!silent) {
        startSiren();
        startVibration();
      }
      startGpsWatch(id);
      readBattery(id);

      // Broadcast to other devices via the backend (no-op when disabled)
      if (isBackendEnabled()) backendCreate(emergency);

      // Notify nearby users through the existing alert system
      const meta = LEVEL_META[level];
      useIncidentStore.getState().addAlert({
        incidentId: id,
        type: "URGENT",
        message: `🆘 SOS — Someone nearby needs immediate help${
          silent ? "" : ` (${meta.label})`
        }. ~150 m away. Open the map to view their live location.`,
        radiusKm: 2,
      });
    },

    markSafe: () => {
      const { activeId } = get();
      if (!activeId) return;
      stopSiren();
      stopVibration();
      stopGpsWatch();
      localStorage.removeItem(SOS_KEY);
      set((s) => ({
        activeId: null,
        emergencies: s.emergencies.map((e) =>
          e.id === activeId
            ? { ...e, status: "RESOLVED", resolvedAt: new Date().toISOString() }
            : e,
        ),
      }));
      if (isBackendEnabled()) resolveEmergencyRemote(activeId);
    },

    resolveEmergency: (id) => {
      const { activeId } = get();
      if (id === activeId) {
        get().markSafe();
        return;
      }
      set((s) => ({
        emergencies: s.emergencies.map((e) =>
          e.id === id
            ? { ...e, status: "RESOLVED", resolvedAt: new Date().toISOString() }
            : e,
        ),
      }));
      if (isBackendEnabled()) resolveEmergencyRemote(id);
    },

    // Counter mutations: with a backend, the RPC is authoritative and the change
    // returns via realtime — so don't also bump locally (would double-count).
    acknowledge: (id) => {
      if (isBackendEnabled()) {
        backendAck(id);
        return;
      }
      set((s) => ({
        emergencies: s.emergencies.map((e) =>
          e.id === id ? { ...e, acks: e.acks + 1 } : e,
        ),
      }));
    },

    voteSafe: (id) => {
      if (isBackendEnabled()) {
        backendVoteSafe(id);
        return;
      }
      set((s) => ({
        emergencies: s.emergencies.map((e) =>
          e.id === id ? { ...e, safeVotes: e.safeVotes + 1 } : e,
        ),
      }));
    },

    startSafetyTimer: (durationMin, note) => {
      const timer: SafetyTimer = {
        deadline: Date.now() + durationMin * 60_000,
        durationMin,
        note,
      };
      saveJson(TIMER_KEY, timer);
      set({ safetyTimer: timer });
    },

    cancelSafetyTimer: () => {
      localStorage.removeItem(TIMER_KEY);
      set({ safetyTimer: null });
    },

    checkSafetyTimer: () => {
      const { safetyTimer, activeId } = get();
      if (!safetyTimer || activeId) return;
      if (Date.now() >= safetyTimer.deadline) {
        const note = safetyTimer.note
          ? `Safety timer expired — ${safetyTimer.note}`
          : "Safety timer expired without check-in.";
        localStorage.removeItem(TIMER_KEY);
        set({ safetyTimer: null });
        get().activateSos("THREAT", { auto: true, note });
      }
    },

    simulateEmergency: () => {
      const id = `sos-sim-${Date.now()}`;
      const levels: EmergencyLevel[] = ["THREAT", "MEDICAL", "KIDNAP", "VIOLENCE"];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const lat = 4.8 + Math.random() * 0.05;
      const lng = 7.0 + Math.random() * 0.06;
      const emergency: Emergency = {
        id,
        level,
        status: "ACTIVE",
        startedAt: new Date().toISOString(),
        track: [{ lat, lng, t: new Date().toISOString(), accuracy: 12, speed: 1.4 }],
        battery: 40 + Math.floor(Math.random() * 55),
        safeVotes: 0,
        acks: 0,
        source: "sim",
        note: "[SIM] Control-room demo emergency",
      };
      set((s) => ({ emergencies: [emergency, ...s.emergencies] }));

      // Drift the sim marker so the live trail is visible
      if (simDriftTimer) clearInterval(simDriftTimer);
      simDriftTimer = setInterval(() => {
        const e = get().emergencies.find((x) => x.id === id);
        if (!e || e.status !== "ACTIVE") {
          if (simDriftTimer) clearInterval(simDriftTimer);
          simDriftTimer = null;
          return;
        }
        const last = e.track[e.track.length - 1];
        appendTrack(id, {
          lat: last.lat + (Math.random() - 0.45) * 0.0012,
          lng: last.lng + (Math.random() - 0.45) * 0.0012,
          t: new Date().toISOString(),
          accuracy: 10 + Math.random() * 15,
          speed: 0.8 + Math.random() * 1.6,
        });
      }, 3000);
    },

    upsertRemoteEmergency: (e) =>
      set((s) => {
        const idx = s.emergencies.findIndex((x) => x.id === e.id);
        if (idx === -1) return { emergencies: [e, ...s.emergencies] };
        const next = s.emergencies.slice();
        // Keep whichever track is longer (ours may be ahead of the snapshot).
        const keepTrack =
          next[idx].track.length >= e.track.length ? next[idx].track : e.track;
        next[idx] = { ...next[idx], ...e, track: keepTrack };
        return { emergencies: next };
      }),

    applyRemoteTrackPoint: (emergencyId, p) =>
      set((s) => {
        // Skip echoes of this device's own points (already appended locally).
        if (emergencyId === s.activeId) return s;
        return {
          emergencies: s.emergencies.map((e) =>
            e.id === emergencyId && e.status === "ACTIVE"
              ? { ...e, track: [...e.track.slice(-199), p] }
              : e,
          ),
        };
      }),
  };
});

// Dev-only handle for debugging/testing from the console
if (import.meta.env.DEV) (window as any).__emergencyStore = useEmergencyStore;
