/**
 * useLiveData — polls for fresh Port Harcourt incidents (Gemini + RSS)
 * and merges them into the global incident store with 3-layer deduplication:
 *  1. Stable coordinate-grid ID
 *  2. Same type within ~500 m
 *  3. Same headline/summary (catches RSS same story at different coords)
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useIncidentStore } from '../store/useIncidentStore';
import { fetchLivePortHarcourtIncidents } from '../services/liveIncidents';

const POLL_INTERVAL_MS = 15 * 60_000; // 15 minutes — respects Gemini free-tier quota

export type LiveState = 'idle' | 'fetching' | 'success' | 'error';

export interface LiveStatus {
  state: LiveState;
  lastUpdated: Date | null;
  newCount: number;        // incidents added in the last fetch
  nextRefreshIn: number;   // seconds until next poll
  error: string | null;
}

/** Normalise a summary string to a 60-char fingerprint for dedup */
function summaryFingerprint(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 60);
}

export function useLiveData() {
  const [status, setStatus] = useState<LiveStatus>({
    state: 'idle',
    lastUpdated: null,
    newCount: 0,
    nextRefreshIn: POLL_INTERVAL_MS / 1000,
    error: null,
  });

  const doFetch = useCallback(async () => {
    setStatus((prev) => ({ ...prev, state: 'fetching', error: null, newCount: 0 }));

    try {
      const liveIncidents = await fetchLivePortHarcourtIncidents();

      // Snapshot of current incidents so dedup checks are consistent
      const currentIncidents = useIncidentStore.getState().incidents;

      let added = 0;
      // Track IDs/summaries added within THIS fetch run to catch intra-loop duplicates
      const seenThisRun = new Set<string>();

      for (const inc of liveIncidents) {
        // Layer 1: stable coordinate-grid ID (type + ~500 m bucket)
        const stableId = `live-${inc.type}-${Math.round(inc.latitude * 200)}-${Math.round(inc.longitude * 200)}`;

        // Layer 3 key: normalised summary fingerprint
        const fp = summaryFingerprint(inc.summary ?? inc.description ?? '');
        const summaryKey = fp.length > 10 ? `sum-${inc.type}-${fp}` : '';

        // Skip intra-loop duplicates first
        if (seenThisRun.has(stableId) || (summaryKey && seenThisRun.has(summaryKey))) continue;

        // Skip against already-stored incidents
        const duplicate = currentIncidents.some((e) => {
          // Layer 1 — same stable ID
          if (e.id === stableId) return true;
          // Layer 2 — same type within ~500 m
          if (
            e.type === inc.type &&
            Math.abs(e.latitude  - inc.latitude)  < 0.005 &&
            Math.abs(e.longitude - inc.longitude) < 0.005
          ) return true;
          // Layer 3 — same headline (RSS story at different coords)
          if (summaryKey) {
            const eFp = summaryFingerprint(e.summary ?? e.description ?? '');
            if (eFp === fp) return true;
          }
          return false;
        });

        if (!duplicate) {
          seenThisRun.add(stableId);
          if (summaryKey) seenThisRun.add(summaryKey);

          useIncidentStore.getState().addIncident({
            _id: stableId,
            type: inc.type,
            description: inc.description,
            latitude: inc.latitude,
            longitude: inc.longitude,
            severityScore: inc.severity,
            confidenceScore: 78 + Math.floor(Math.random() * 17),
            summary: inc.summary,
            cues: [inc.locationName, ...inc.cues].slice(0, 6),
            source: 'live',
          });
          added++;
        }
      }

      setStatus({
        state: 'success',
        lastUpdated: new Date(),
        newCount: added,
        nextRefreshIn: POLL_INTERVAL_MS / 1000,
        error: null,
      });
    } catch (err) {
      console.error('[useLiveData] fetch error:', err);
      setStatus((prev) => ({
        ...prev,
        state: 'error',
        error: 'AI service unavailable',
        nextRefreshIn: POLL_INTERVAL_MS / 1000,
      }));
    }
  }, []);

  // Kick off immediately on mount, then poll every POLL_INTERVAL_MS
  const doFetchRef = useRef(doFetch);
  doFetchRef.current = doFetch;

  useEffect(() => {
    doFetchRef.current();

    const pollId  = setInterval(() => doFetchRef.current(), POLL_INTERVAL_MS);

    // Countdown every second
    const countId = setInterval(() => {
      setStatus((prev) => {
        if (prev.state === 'fetching') return prev;
        return { ...prev, nextRefreshIn: Math.max(0, prev.nextRefreshIn - 1) };
      });
    }, 1000);

    return () => {
      clearInterval(pollId);
      clearInterval(countId);
    };
  }, []); // run once — doFetchRef always points to latest version

  return { status, refresh: () => doFetchRef.current() };
}
