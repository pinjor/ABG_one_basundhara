/**
 * Serves the Flutter web build of the mobile app and proxies /api to the API,
 * so the app can be tried in a phone-sized browser window without CORS setup.
 *
 *   cd apps/mobile && flutter build web --no-web-resources-cdn
 *   bun scripts/serve-mobile-web.ts            # http://localhost:18495
 */
import { file } from "bun";
import { join, normalize } from "path";

const root = join(import.meta.dir, "../apps/mobile/build/web");
const api = process.env.API_ORIGIN ?? "http://localhost:18491";
const port = Number(process.env.PORT ?? 18495);

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      return fetch(`${api}${url.pathname}${url.search}`, { method: req.method, headers: req.headers, body: req.body, redirect: "manual" });
    }
    const path = normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
    const target = file(join(root, path === "/" ? "index.html" : path));
    return (await target.exists()) ? new Response(target) : new Response(file(join(root, "index.html")));
  },
});
console.log(`ABG Dispatch mobile (web build) on http://localhost:${port} → API ${api}`);
