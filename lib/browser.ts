import { chromium as chromiumExtra } from "playwright-extra";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
import type { Browser, Page } from "playwright";

chromiumExtra.use(StealthPlugin());

let _browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!_browser || !(_browser as Browser).isConnected()) {
    console.log("[Browser] Launching Chromium with stealth...");
    _browser = await chromiumExtra.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
        "--no-zygote",
        "--disable-blink-features=AutomationControlled",
      ],
    }) as unknown as Browser;
    console.log("[Browser] Chromium launched OK");
  }
  return _browser;
}

// Additional runtime stealth overrides on top of plugin
export async function stealthPage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });

    (window as unknown as Record<string, unknown>).chrome = {
      runtime: {},
      loadTimes: () => ({}),
      csi: () => ({}),
      app: {},
    };

    const origQuery = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = (p: PermissionDescriptor) =>
      p.name === "notifications"
        ? Promise.resolve({ state: Notification.permission, onchange: null } as PermissionStatus)
        : origQuery(p);

    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, "languages", { get: () => ["en-IN", "en"] });
  });
}
