import { chromium } from "playwright";
import type { Browser, Page } from "playwright";

let _browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!_browser || !_browser.isConnected()) {
    console.log("[Browser] Launching Chromium...");
    _browser = await chromium.launch({
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
    });
    console.log("[Browser] Chromium launched OK");
  }
  return _browser;
}

// Inject stealth overrides so sites don't detect headless Chromium
export async function stealthPage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Hide webdriver flag
    Object.defineProperty(navigator, "webdriver", { get: () => false });

    // Add realistic chrome object
    (window as unknown as Record<string, unknown>).chrome = {
      runtime: {},
      loadTimes: () => ({}),
      csi: () => ({}),
      app: {},
    };

    // Fix permissions API
    const origQuery = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = (p: PermissionDescriptor) =>
      p.name === "notifications"
        ? Promise.resolve({ state: Notification.permission, onchange: null } as PermissionStatus)
        : origQuery(p);

    // Realistic plugins + languages
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, "languages", { get: () => ["en-IN", "en"] });
  });
}
