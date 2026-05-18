import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";

chromium.use(StealthPlugin());

const SESSION_FILE = ".instamart-session-state.json";
const SEARCH_QUERY = process.argv[2] || "red bull";

async function main() {
  if (!fs.existsSync(SESSION_FILE)) {
    console.error("❌ Run setup first:\n   npx tsx scripts/setup-instamart-location.ts");
    process.exit(1);
  }

  console.log(`🔍 Intercepting Instamart for "${SEARCH_QUERY}"...`);

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

  // Step 1: Load homepage naturally
  console.log("Loading Swiggy homepage...");
  await page.goto("https://www.swiggy.com", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Step 2: Navigate to Instamart
  console.log("Opening Instamart...");
  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "instamart-home.png" });
  console.log("📸 instamart-home.png saved");

  // Step 3: Find and click the search bar
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

  await page.waitForTimeout(500);
  await page.keyboard.type(SEARCH_QUERY, { delay: 80 });
  await page.waitForTimeout(500);
  await page.keyboard.press("Enter");

  // Wait for results
  console.log("Waiting for results...");
  await page.waitForTimeout(6000);
  await page.screenshot({ path: "instamart-results.png" });
  console.log("📸 instamart-results.png saved");

  fs.writeFileSync(".instamart-api-data.json", JSON.stringify(captured, null, 2));
  console.log(`\n💾 Captured ${captured.length} API responses`);

  await page.waitForTimeout(5000);
  await browser.close();
}

main().catch(console.error);
