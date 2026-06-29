import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Hosts the dev feed-proxy may fetch from. Keep this tight — it is a server-side
// fetch on behalf of the browser, so an open proxy would be an SSRF hole.
const ALLOWED_FEED_HOSTS = [
  'news.google.com',
  'api.gdeltproject.org',
  'www.reddit.com',
  'reddit.com',
  'punchng.com',
  'www.vanguardngr.com',
  'dailypost.ng',
  'www.premiumtimesng.com',
  'www.thecable.ng',
  'guardian.ng',
  'www.channelstv.com',
  'saharareporters.com',
  'leadership.ng',
  'tribuneonlineng.com',
];

// Same-origin dev proxy: GET /_proxy?url=<encoded> → fetches the URL server-side
// (no CORS restriction in Node) and returns the body. Dev-only; production uses
// VITE_PROXY_BASE or the public CORS-proxy chain (see src/services/proxy.ts).
function feedProxy(): Plugin {
  return {
    name: 'aiwee-feed-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/_proxy', async (req, res) => {
        try {
          const reqUrl = new URL(req.url ?? '', 'http://localhost');
          const target = reqUrl.searchParams.get('url');
          if (!target) {
            res.statusCode = 400;
            res.end('missing url param');
            return;
          }
          const parsed = new URL(target);
          const allowed = ALLOWED_FEED_HOSTS.some(
            (h) => parsed.hostname === h || parsed.hostname.endsWith('.' + h),
          );
          if (!/^https?:$/.test(parsed.protocol) || !allowed) {
            res.statusCode = 403;
            res.end('host not allowed');
            return;
          }

          const upstream = await fetch(target, {
            signal: AbortSignal.timeout(12_000),
            headers: {
              // Some outlets block default fetch UAs; a browser UA is enough.
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
              Accept: 'application/rss+xml, application/xml, application/json, text/html, */*',
            },
          });
          const body = await upstream.text();
          res.statusCode = upstream.status;
          res.setHeader(
            'Content-Type',
            upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8',
          );
          res.end(body);
        } catch (err: any) {
          res.statusCode = 502;
          res.end(`proxy error: ${err?.message ?? 'unknown'}`);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    feedProxy(),
  ],
});
