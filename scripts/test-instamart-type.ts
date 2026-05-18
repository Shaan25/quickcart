import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";

chromium.use(StealthPlugin());

const SESSION_FILE = ".instamart-session-state.json";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled", "--lang=en-IN"],
  });

  const context = await browser.newContext({
    storageState: SESSION_FILE,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  
  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("swiggy.com") || url.includes("media-assets")) return;
    const ct = res.headers()["content-type"] ?? "";
    if (!ct.includes("application/json")) return;
    try {
      const json = await res.json();
      const keys = typeof json === "object" && json ? Object.keys(json) : [];
      console.log(`[${res.status()}] ${url.slice(0, 120)}`);
      console.log(`  keys: ${keys.join(", ")}`);
      
      if (url.includes("search") || url.includes("Search")) {
        fs.writeFileSync(".instamart-search-response.json", JSON.stringify(json, null, 2));
        console.log("  💾 SEARCH RESPONSE SAVED");
      }
      console.log();
    } catch {}
  });

  // Step 1: Homepage
  console.log("Loading Instamart homepage...");
  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);
  
  // Step 2: Click search bar
  console.log("Looking for search bar...");
  const searchSelectors = [
    'input[placeholder*="Search"]',
    'input[placeholder*="search"]',
    '[class*="searchBar"] input',
    '[class*="search-bar"] input',
    'input[type="search"]',
    'input',
  ];
  
  let clicked = false;
  for (const sel of searchSelectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click();
        console.log(`  Clicked: ${sel}`);
        clicked = true;
        break;
      }
    } catch {}
  }
  
  if (!clicked) {
    console.log("  Could not find search bar - taking screenshot");
    await page.screenshot({ path: "instamart-debug.png" });
  }
  
  await page.waitForTimeout(500);
  await page.keyboard.type("red bull", { delay: 100 });
  await page.waitForTimeout(2000);
  await page.keyboard.press("Enter");
  
  console.log("Waiting for search results...");
  await page.waitForTimeout(8000);
  
  await page.screenshot({ path: "instamart-search-results.png" });
  console.log("📸 instamart-search-results.png saved");
  
  await browser.close();
}

main().catch(console.error);
