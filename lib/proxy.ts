import type { BrowserContextOptions } from "playwright";

// Set PROXY_URL as: http://username:password@host:port
// e.g. http://user:pass@gate.smartproxy.com:10001
export function proxyOptions(): Pick<BrowserContextOptions, "proxy"> | Record<string, never> {
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
