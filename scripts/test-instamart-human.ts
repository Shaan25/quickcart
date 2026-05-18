import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";

chromium.use(StealthPlugin());
const SESSION_FILE = ".instamart-session-state.json";

// Simulate human mouse movement (bezier curve)
async function humanMove(page: import("playwright").Page, x: number, y: number) {
  const current = { x: 200, y: 400 };
  const steps = 20 + Math.floor(Math.random() * 10);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = current.x + (x - current.x) * t + Math.sin(t * Math.PI) * (Math.random() * 20 - 10);
    const cy = current.y + (y - current.y) * t + Math.sin(t * Math.PI) * (Math.random() * 20 - 10);
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(10 + Math.random() * 20);
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--lang=en-IN",
      "--window-size=1440,900",
    ],
  });
  const context = await browser.newContext({
    storageState: SESSION_FILE,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-IN", timezoneId: "Asia/Kolkata", viewport: { width: 1440, height: 900 },
    colorScheme: "no-preference",
    deviceScaleFactor: 2,
  });

  // Patch webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["en-IN", "en"] });
    (window as unknown as Record<string, unknown>).chrome = { runtime: {} };
  });

  const page = await context.newPage();

  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes("fna.swiggy")) {
      try {
        const json = await res.json();
        console.log("FNA response:", JSON.stringify(json).slice(0, 200));
      } catch {}
    }
    if (!url.includes("swiggy.com/api/instamart")) return;
    const headers = res.headers();
    const rateLimit = headers["x-rate-limit"] ?? "";
    try {
      const text = await res.text();
      console.log(`[${res.status()}] ${url.slice(0, 100)}`);
      if (rateLimit) console.log(`  x-rate-limit: ${rateLimit}`);
      if (text.length > 5) {
        console.log(`  body: ${text.slice(0, 200)}`);
        if (url.includes("suggest-items") || url.includes("search/mart")) {
          fs.writeFileSync(`.instamart-${url.includes("mart") ? "mart" : "suggest"}-v2.json`, text);
          console.log("  💾 SAVED\n");
        }
      } else {
        console.log("  body: EMPTY\n");
      }
    } catch {}
  });

  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);

  // Human-like mouse movements before interacting
  console.log("Doing human-like mouse movements...");
  await humanMove(page, 400, 300);
  await page.waitForTimeout(500);
  await humanMove(page, 700, 200);
  await page.waitForTimeout(300);
  await humanMove(page, 640, 45);

  // Click the search button
  await page.mouse.click(640, 45, { delay: 100 });
  await page.waitForTimeout(1500);

  const input = page.locator('input[type="search"]').first();
  const inputVisible = await input.isVisible({ timeout: 2000 }).catch(() => false);
  console.log("Search input visible:", inputVisible);

  if (inputVisible) {
    await humanMove(page, 700, 45);
    await page.mouse.click(700, 45, { delay: 80 });
    await page.waitForTimeout(500);
    await page.keyboard.type("red bull", { delay: 180 + Math.random() * 50 });
    await page.waitForTimeout(3000);
  }

  await browser.close();
}

main().catch(console.error);
