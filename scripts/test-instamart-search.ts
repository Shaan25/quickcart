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
  
  const captured: { url: string; status: number; keys: string[] }[] = [];
  
  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("swiggy.com/api") && !url.includes("swiggy.com/dapi")) return;
    try {
      const json = await res.json();
      const keys = typeof json === "object" && json ? Object.keys(json) : [];
      console.log(`[${res.status()}] ${url.slice(0, 120)}`);
      console.log(`  keys: ${keys.join(", ")}\n`);
      captured.push({ url, status: res.status(), keys });
      
      // Save full data for search responses
      if (url.includes("search") || url.includes("Search")) {
        fs.writeFileSync(`.instamart-search-${Date.now()}.json`, JSON.stringify(json, null, 2));
        console.log("  💾 SAVED SEARCH RESPONSE!\n");
      }
    } catch {}
  });

  console.log("Navigating to Instamart search...");
  await page.goto("https://www.swiggy.com/instamart/search?query=red+bull", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(8000);
  
  await page.screenshot({ path: "instamart-search.png" });
  console.log("\n📸 Screenshot saved");
  console.log(`\nTotal API calls captured: ${captured.length}`);

  await browser.close();
}

main().catch(console.error);
