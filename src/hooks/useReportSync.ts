/**
 * useReportSync — drains the offline report queue.
 *
 * Runs AI analysis for each queued report and posts the resulting incident to
 * the store. Triggers on mount, whenever the browser comes back online, and on
 * a slow retry interval (covers transient AI-service outages while online).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useIncidentStore } from "../store/useIncidentStore";
import { analyzeIncident } from "../services/ai";
import {
  getQueuedReports,
  removeQueuedReport,
  subscribeQueue,
  updateQueuedReport,
} from "../services/reportQueue";

const RETRY_INTERVAL_MS = 60_000;

export function useReportSync() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [syncing, setSyncing] = useState(false);
  const busy = useRef(false);

  const processQueue = useCallback(async () => {
    if (busy.current || !navigator.onLine) return;
    const queue = getQueuedReports();
    if (queue.length === 0) return;

    busy.current = true;
    setSyncing(true);
    try {
      const store = useIncidentStore.getState();
      for (const r of queue) {
        try {
          let base64Data: string | undefined;
          let mimeType: string | undefined;
          if (r.image) {
            const parts = r.image.split(",");
            mimeType = parts[0].match(/:(.*?);/)?.[1];
            base64Data = parts[1];
          }

          const analysis = await analyzeIncident(
            r.description,
            base64Data,
            mimeType,
            r.latitude,
            r.longitude,
          );

          // Post the fully-analysed incident (single source of truth: addIncident
          // dedupes on _id, so a double-drain is harmless).
          store.addIncident({
            _id: r.id,
            type: analysis.incidentType as any,
            description: r.description,
            latitude: r.latitude,
            longitude: r.longitude,
            severityScore: analysis.severityScore,
            confidenceScore: analysis.confidenceScore,
            summary: analysis.summary,
            cues: analysis.cues,
            corroboratingEvidence: analysis.corroboratingEvidence,
            nearbyPlaces: analysis.nearbyPlaces,
            mediaUrl: r.image,
            source: "citizen",
          });
          removeQueuedReport(r.id);
        } catch {
          // AI still unavailable — bump attempts and stop; retry later.
          updateQueuedReport(r.id, { attempts: r.attempts + 1 });
          break;
        }
      }
    } finally {
      busy.current = false;
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeQueue((q) => setPending(q.length));

    const onOnline = () => {
      setOnline(true);
      processQueue();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    processQueue();
    const intervalId = setInterval(processQueue, RETRY_INTERVAL_MS);

    return () => {
      unsub();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(intervalId);
    };
  }, [processQueue]);

  return { pending, online, syncing, processQueue };
}
