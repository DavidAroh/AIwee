/**
 * AiWee backend — REST + Server-Sent Events.
 *
 *   GET  /health                 liveness
 *   GET  /api/incidents          current live incidents
 *   POST /api/reports            citizen report -> classified incident
 *   GET  /api/sos                active emergencies
 *   POST /api/sos                create an SOS
 *   POST /api/sos/:id/track      append a GPS point
 *   POST /api/sos/:id/ack        responder acknowledgement
 *   POST /api/sos/:id/safe-vote  "user appears safe" vote
 *   POST /api/sos/:id/resolve    operator resolution
 *   GET  /api/stream             SSE: snapshot + live incident/SOS pushes
 *
 * Collection runs server-side on an interval, so browsers/phones never hit the
 * news APIs directly (no CORS, no rate-limit bursts, no blocked Reddit).
 */
import express from "express";
import cors from "cors";
import type { Request, Response } from "express";
import { store } from "./store.js";
import { collectAll } from "./collectors/sources.js";
import type { ServerEvent } from "./types.js";

const PORT = Number(process.env.PORT) || 4000;
const POLL_MS = (Number(process.env.POLL_INTERVAL_MIN) || 15) * 60_000;
const CORS_ORIGINS = (process.env.CORS_ORIGINS ??
  "http://localhost:3000,http://localhost:8081,http://localhost:19006")
  .split(",")
  .map((s) => s.trim());

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: (origin, cb) =>
      !origin || CORS_ORIGINS.includes(origin) || CORS_ORIGINS.includes("*")
        ? cb(null, true)
        : cb(null, true), // permissive for dev; tighten for prod
  }),
);

// ── SSE hub ──────────────────────────────────────────────────────────────────────
const clients = new Set<Response>();

function broadcast(event: ServerEvent) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) res.write(payload);
}
store.on("event", broadcast);

app.get("/api/stream", (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(`data: ${JSON.stringify(store.snapshot())}\n\n`);
  clients.add(res);

  const keepAlive = setInterval(() => res.write(": ping\n\n"), 25_000);
  req.on("close", () => {
    clearInterval(keepAlive);
    clients.delete(res);
  });
});

// ── REST ─────────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ ok: true, clients: clients.size, incidents: store.getIncidents().length }),
);

app.get("/api/incidents", (_req, res) => res.json({ incidents: store.getIncidents() }));

app.post("/api/reports", (req, res) => {
  const { description, quickType, latitude, longitude } = req.body ?? {};
  if (!description || typeof description !== "string")
    return res.status(400).json({ error: "description required" });
  const incident = store.addReport({ description, quickType, latitude, longitude });
  res.status(201).json({ incident });
});

app.get("/api/sos", (_req, res) => res.json({ emergencies: store.getEmergencies() }));

app.post("/api/sos", (req, res) => {
  const { level, track, note, auto, battery, deviceId } = req.body ?? {};
  const levels = ["THREAT", "MEDICAL", "KIDNAP", "VIOLENCE", "SILENT"];
  if (!levels.includes(level)) return res.status(400).json({ error: "invalid level" });
  const startTrack =
    Array.isArray(track) && track.length > 0
      ? track
      : [{ lat: 4.8156, lng: 7.0498, t: new Date().toISOString() }];
  const emergency = store.createEmergency({ level, track: startTrack, note, auto, battery, deviceId });
  res.status(201).json({ emergency });
});

app.post("/api/sos/:id/track", (req, res) => {
  const { lat, lng, accuracy, speed } = req.body ?? {};
  if (typeof lat !== "number" || typeof lng !== "number")
    return res.status(400).json({ error: "lat/lng required" });
  const e = store.appendTrack(req.params.id, {
    lat,
    lng,
    accuracy,
    speed,
    t: new Date().toISOString(),
  });
  if (!e) return res.status(404).json({ error: "not found or resolved" });
  res.json({ emergency: e });
});

app.post("/api/sos/:id/ack", (req, res) => {
  const e = store.getEmergencies().find((x) => x.id === req.params.id);
  if (!e) return res.status(404).json({ error: "not found" });
  res.json({ emergency: store.updateEmergency(e.id, { acks: e.acks + 1 }) });
});

app.post("/api/sos/:id/safe-vote", (req, res) => {
  const e = store.getEmergencies().find((x) => x.id === req.params.id);
  if (!e) return res.status(404).json({ error: "not found" });
  res.json({ emergency: store.updateEmergency(e.id, { safeVotes: e.safeVotes + 1 }) });
});

app.post("/api/sos/:id/resolve", (req, res) => {
  const e = store.updateEmergency(req.params.id, {
    status: "RESOLVED",
    resolvedAt: new Date().toISOString(),
  });
  if (!e) return res.status(404).json({ error: "not found" });
  res.json({ emergency: e });
});

// ── Collection poller ──────────────────────────────────────────────────────────
async function poll() {
  try {
    const { incidents, counts } = await collectAll();
    const fresh = store.ingestCollected(incidents);
    console.log(
      `[collect] ${fresh.length} new / ${incidents.length} candidates ` +
        `(gnews ${counts.gnews} · gdelt ${counts.gdelt} · outlets ${counts.outlets} · reddit ${counts.reddit})`,
    );
  } catch (err) {
    console.error("[collect] failed:", (err as Error).message);
  }
}

app.listen(PORT, () => {
  console.log(`AiWee backend on http://localhost:${PORT}`);
  poll();
  setInterval(poll, POLL_MS);
});
