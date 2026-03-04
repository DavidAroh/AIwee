/**
 * useLiveData — polls Gemini AI every 90 s for fresh Port Harcourt incidents
 * and merges them into the global incident store, deduplicating by coordinates.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useIncidentStore } from '../store/useIncidentStore';
import { fetchLivePortHarcourtIncidents } from '../services/liveIncidents';

const POLL_INTERVAL_MS = 5 * 60_000; // 5 minutes between AI calls

export type LiveState = 'idle' | 'fetching' | 'success' | 'error';

export interface LiveStatus {
  state: LiveState;
  lastUpdated: Date | null;
  newCount: number;        // incidents added in the last fetch
  nextRefreshIn: number;   // seconds until next poll
  error: string | null;
}

export function useLiveData() {
  const addIncident = useIncidentStore((s) => s.addIncident);

  const [status, setStatus] = useState<LiveStatus>({
    state: 'idle',
    lastUpdated: null,
    newCount: 0,
    nextRefreshIn: POLL_INTERVAL_MS / 1000,
    error: null,
  });

  // Stable reference to the async fetch+merge logic
  const doFetch = useCallback(async () => {
    setStatus((prev) => ({ ...prev, state: 'fetching', error: null, newCount: 0 }));

    try {
      const liveIncidents = await fetchLivePortHarcourtIncidents();

      // Read current state directly to avoid stale closure
      const currentIncidents = useIncidentStore.getState().incidents;

      let added = 0;
      for (const inc of liveIncidents) {
        // Stable ID: type + location rounded to ~500m grid
        const stableId = `live-${inc.type}-${Math.round(inc.latitude * 200)}-${Math.round(inc.longitude * 200)}`;

        // Deduplicate: skip if same stable ID already exists OR same type within ~500m
        const duplicate = currentIncidents.some(
          (e) =>
            e.id === stableId ||
            (e.type === inc.type &&
             Math.abs(e.latitude  - inc.latitude)  < 0.005 &&
             Math.abs(e.longitude - inc.longitude) < 0.005)
        );

        if (!duplicate) {
          // Directly set the store to use our stable ID
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
  }, [addIncident]);

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
