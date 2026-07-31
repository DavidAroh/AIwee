/**
 * store — in-memory application state + event bus.
 *
 * Holds live incidents and active SOS emergencies, and emits ServerEvents that
 * the SSE layer fans out to every connected client (web + mobile). In-memory is
 * fine for Phase 1 / a single instance; swap for Postgres + Redis pub/sub to
 * scale horizontally.
 */
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { Emergency, Incident, ServerEvent } from "./types.js";
import {
  detectSeverity,
  detectType,
  resolveLocation,
} from "./collectors/heuristics.js";

class Store extends EventEmitter {
  private incidents = new Map<string, Incident>();
  private emergencies = new Map<string, Emergency>();

  // ── Incidents ────────────────────────────────────────────────────────────────
  getIncidents(): Incident[] {
    return [...this.incidents.values()].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  /** Merge a freshly-collected batch; emit only the genuinely new ones. */
  ingestCollected(batch: Incident[]): Incident[] {
    const fresh: Incident[] = [];
    for (const inc of batch) {
      const dup = [...this.incidents.values()].some(
        (e) =>
          e.type === inc.type &&
          Math.abs(e.latitude - inc.latitude) < 0.005 &&
          Math.abs(e.longitude - inc.longitude) < 0.005,
      );
      if (dup) continue;
      this.incidents.set(inc.id, inc);
      fresh.push(inc);
    }
    // Cap memory
    if (this.incidents.size > 200) {
      const oldest = this.getIncidents().slice(200);
      for (const o of oldest) this.incidents.delete(o.id);
    }
    if (fresh.length > 0) this.emit("event", { type: "incidents", incidents: fresh } satisfies ServerEvent);
    return fresh;
  }

  /** Citizen report → classified incident (heuristics; Gemini optional later). */
  addReport(input: {
    description: string;
    quickType?: string;
    latitude?: number;
    longitude?: number;
  }): Incident {
    const text = input.quickType ? `[${input.quickType}] ${input.description}` : input.description;
    const type = input.quickType && isType(input.quickType) ? (input.quickType as Incident["type"]) : detectType(text);
    const sev = detectSeverity(text);
    const loc =
      typeof input.latitude === "number" && typeof input.longitude === "number"
        ? { name: "Reported location", lat: input.latitude, lng: input.longitude }
        : resolveLocation(text);
    const inc: Incident = {
      id: `citizen-${randomUUID()}`,
      type,
      description: input.description.slice(0, 400),
      locationName: loc.name,
      latitude: loc.lat,
      longitude: loc.lng,
      severity: sev,
      summary: input.description.slice(0, 120),
      cues: [loc.name, type.toLowerCase(), "citizen"],
      confidenceScore: 55,
      sourceKind: "citizen",
      timestamp: new Date().toISOString(),
    };
    this.incidents.set(inc.id, inc);
    this.emit("event", { type: "incidents", incidents: [inc] } satisfies ServerEvent);
    return inc;
  }

  // ── Emergencies (SOS) ──────────────────────────────────────────────────────────
  getEmergencies(): Emergency[] {
    return [...this.emergencies.values()].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
  }

  createEmergency(input: Partial<Emergency> & { level: Emergency["level"]; track: Emergency["track"] }): Emergency {
    const e: Emergency = {
      id: `sos-${randomUUID()}`,
      level: input.level,
      status: "ACTIVE",
      startedAt: new Date().toISOString(),
      track: input.track,
      battery: input.battery,
      safeVotes: 0,
      acks: 0,
      note: input.note,
      auto: input.auto,
      deviceId: input.deviceId,
    };
    this.emergencies.set(e.id, e);
    this.emit("event", { type: "emergency", emergency: e } satisfies ServerEvent);
    return e;
  }

  updateEmergency(id: string, patch: Partial<Emergency>): Emergency | null {
    const e = this.emergencies.get(id);
    if (!e) return null;
    const updated = { ...e, ...patch };
    this.emergencies.set(id, updated);
    this.emit("event", { type: "emergency-update", emergency: updated } satisfies ServerEvent);
    return updated;
  }

  appendTrack(id: string, point: Emergency["track"][number]): Emergency | null {
    const e = this.emergencies.get(id);
    if (!e || e.status !== "ACTIVE") return null;
    return this.updateEmergency(id, { track: [...e.track.slice(-199), point] });
  }

  snapshot(): ServerEvent {
    return { type: "snapshot", incidents: this.getIncidents(), emergencies: this.getEmergencies() };
  }
}

function isType(t: string): boolean {
  return ["Fire", "Accident", "Crime", "Medical", "Flood", "Other"].includes(t);
}

export const store = new Store();
