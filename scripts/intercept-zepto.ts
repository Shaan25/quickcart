import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";

chromium.use(StealthPlugin());

const SESSION_FILE = ".zepto-session-state.json";
const SEARCH_QUERY = process.argv[2] || "red bull";

async function main() {
  if (!fs.existsSync(SESSION_FILE)) {
    console.error("❌ Run setup first:\n   npx tsx scripts/setup-zepto-location.ts");
    process.exit(1);
  }

  console.log(`🔍 Intercepting Zepto for "${SEARCH_QUERY}"...`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: SESSION_FILE });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const captured: { url: string; keys: string[]; data: unknown }[] = [];

  page.on("response", async (res) => {
    const ct = res.headers()["content-type"] ?? "";
    if (!ct.includes("application/json")) return;
    const url = res.url();
    if (url.includes("nr-data") || url.includes("analytics") || url.includes("google") || url.includes("awswaf")) return;
    try {
      const json = await res.json();
      const keys = typeof json === "object" && json ? Object.keys(json) : [];
      console.log(`📡 ${url.slice(0, 120)}`);
      console.log(`   Keys: ${keys.join(", ")}\n`);
      captured.push({ url, keys, data: json });
    } catch {}
  });

  await page.goto("https://www.zeptonow.com", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "zepto-home.png" });
  console.log("📸 zepto-home.png saved\n");

  // Search
  console.log(`Searching for "${SEARCH_QUERY}"...`);
  const searchSelectors = [
    '[placeholder*="Search"]', '[placeholder*="search"]',
    '[aria-label*="search"]', 'input', '[class*="search"]',
  ];

  for (const sel of searchSelectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click();
        console.log(`  Clicked: ${sel}`);
        break;
      }
    } catch {}
  }

  await page.waitForTimeout(800);
  await page.keyboard.type(SEARCH_QUERY, { delay: 120 });
  await page.waitForTimeout(2000); // wait for autocomplete to settle
  await page.keyboard.press("Enter");
  console.log("  Search submitted, waiting for results...");

  await page.waitForTimeout(8000); // give more time for API to fire
  await page.screenshot({ path: "zepto-results.png" });
  console.log("📸 zepto-results.png saved");

  fs.writeFileSync(".zepto-api-data.json", JSON.stringify(captured, null, 2));
  console.log(`\n💾 Captured ${captured.length} API responses`);

  await page.waitForTimeout(5000);
  await browser.close();
}

main().catch(console.error);
