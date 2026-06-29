/**
 * reportQueue — durable, offline-first queue for citizen reports.
 *
 * When a report can't be analysed immediately (no connection, or the AI
 * service is busy) it is persisted here instead of being lost. `useReportSync`
 * drains the queue — running AI analysis and posting the incident — as soon as
 * connectivity returns.
 *
 * The queue (not the in-memory store) is the source of truth for *pending*
 * reports, so they survive page reloads and app restarts.
 */

export interface QueuedReport {
  id: string; // stable incident id, assigned at submit time
  description: string;
  quickType: string;
  image?: string; // data URL (best-effort — dropped first if storage is full)
  latitude: number;
  longitude: number;
  createdAt: string;
  attempts: number;
}

const KEY = "aiwee_report_queue";

type Listener = (queue: QueuedReport[]) => void;
const listeners = new Set<Listener>();

function read(): QueuedReport[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedReport[]) : [];
  } catch {
    return [];
  }
}

/** Persist the queue, gracefully degrading if storage is full. */
function write(queue: QueuedReport[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    // Likely a quota error from large image data URLs — keep the report text
    // (the part that matters) and drop the images so the queue still persists.
    try {
      const lean = queue.map(({ image, ...rest }) => rest);
      localStorage.setItem(KEY, JSON.stringify(lean));
      queue = lean as QueuedReport[];
    } catch {
      /* give up on persistence, but still notify in-memory listeners */
    }
  }
  listeners.forEach((l) => l(queue));
}

export function getQueuedReports(): QueuedReport[] {
  return read();
}

export function enqueueReport(report: QueuedReport): void {
  write([...read(), report]);
}

export function removeQueuedReport(id: string): void {
  write(read().filter((r) => r.id !== id));
}

export function updateQueuedReport(id: string, patch: Partial<QueuedReport>): void {
  write(read().map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

/** Subscribe to queue changes. Fires immediately with the current queue. */
export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  listener(read());
  return () => {
    listeners.delete(listener);
  };
}
