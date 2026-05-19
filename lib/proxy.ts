import type { BrowserContextOptions } from "playwright";

// Option A: Generic proxy  — PROXY_URL=http://user:pass@host:port
// Option B: ScraperAPI key — SCRAPER_API_KEY=your_key_here
//   Routes through ScraperAPI's residential pool with Indian exit nodes
export function proxyOptions(): Pick<BrowserContextOptions, "proxy"> | Record<string, never> {
  const scraperKey = process.env.SCRAPER_API_KEY;
  if (scraperKey) {
    return {
      proxy: {
        server: "http://proxy-server.scraperapi.com:8001",
        username: "scraperapi",
        password: scraperKey,
      },
    };
  }

  const raw = process.env.PROXY_URL;
  if (!raw) return {};
  try {
    const url = new URL(raw);
    const server = `${url.protocol}//${url.hostname}:${url.port}`;
    const username = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    return { proxy: { server, username, password } };
  } catch {
    console.error("[proxy] Invalid PROXY_URL, skipping proxy");
    return {};
  }
}
