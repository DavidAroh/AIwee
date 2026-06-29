/**
 * proxy — fetch CORS-restricted resources (news feeds/APIs) as text.
 *
 * News providers (Google News RSS, GDELT) don't send CORS headers, so a browser
 * can't read them directly. This helper hides the workaround:
 *
 *   • Dev   → a same-origin Vite proxy (see vite.config.ts) — reliable, no
 *             third-party dependency, full speed.
 *   • Prod  → a chain of public CORS proxies, tried in order (best-effort).
 *
 * For a production deployment, point VITE_PROXY_BASE at your own serverless
 * function (e.g. `/api/proxy?url=`) for a reliable, rate-limit-free source.
 */

const DEV = import.meta.env.DEV;
const PROXY_BASE = import.meta.env.VITE_PROXY_BASE as string | undefined;

/** Map a real URL to the same-origin dev feed-proxy (see vite.config.ts). */
function toDevPath(target: string): string | null {
  try {
    new URL(target); // validate
    return `/_proxy?url=${encodeURIComponent(target)}`;
  } catch {
    return null;
  }
}

const PUBLIC_PROXIES: ((url: string) => string)[] = [
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

async function tryFetchText(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const text = await res.text();
    return text && text.length > 50 ? text : null;
  } catch {
    return null;
  }
}

/** Fetch `target` through the best available proxy. Throws if all routes fail. */
export async function proxyFetchText(target: string, timeoutMs = 8000): Promise<string> {
  // 1) Same-origin dev proxy
  if (DEV) {
    const devPath = toDevPath(target);
    if (devPath) {
      const text = await tryFetchText(devPath, timeoutMs);
      if (text) return text;
    }
  }

  // 2) Configured custom proxy (e.g. your own serverless function)
  if (PROXY_BASE) {
    const text = await tryFetchText(
      `${PROXY_BASE}${encodeURIComponent(target)}`,
      timeoutMs,
    );
    if (text) return text;
  }

  // 3) Public CORS-proxy chain
  for (const make of PUBLIC_PROXIES) {
    const text = await tryFetchText(make(target), timeoutMs);
    if (text) return text;
  }

  throw new Error("proxyFetchText: all proxy routes failed");
}
