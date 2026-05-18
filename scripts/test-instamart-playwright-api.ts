import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";

chromium.use(StealthPlugin());
const SESSION_FILE = ".instamart-session-state.json";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--lang=en-IN"] });
  const context = await browser.newContext({
    storageState: SESSION_FILE,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-IN", timezoneId: "Asia/Kolkata", viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // First navigate to instamart to establish session
  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  const storeId = "1403831";
  const query = "red bull";

  // Use Playwright's context.request (not fetch inside browser) - bypasses CORS
  const endpoints = [
    `https://www.swiggy.com/api/instamart/search/v1?query=${encodeURIComponent(query)}&storeId=${storeId}&clientId=INSTAMART-APP`,
    `https://www.swiggy.com/api/instamart/search/v2?query=${encodeURIComponent(query)}&storeId=${storeId}&clientId=INSTAMART-APP`,
    `https://www.swiggy.com/api/instamart/search/v2?query=${encodeURIComponent(query)}&storeId=${storeId}&primaryStoreId=${storeId}&clientId=INSTAMART-APP&offset=0`,
  ];

  for (const url of endpoints) {
    try {
      const res = await context.request.get(url, {
        headers: {
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-IN,en;q=0.9",
          "Referer": "https://www.swiggy.com/instamart/search?query=red+bull",
          "Origin": "https://www.swiggy.com",
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      const text = await res.text();
      console.log(`[${res.status()}] ${url.slice(0, 100)}`);
      console.log(`  Content-Type: ${res.headers()["content-type"] ?? "none"}`);
      console.log(`  Body (first 300): ${text.slice(0, 300)}`);

      if (res.status() === 200 && text.includes("{")) {
        const json = JSON.parse(text);
        const keys = Object.keys(json);
        console.log(`  keys: ${keys.join(", ")}`);
        fs.writeFileSync(`.instamart-search-${url.includes("v2") ? "v2" : "v1"}.json`, text);
        console.log("  💾 SAVED");
      }
      console.log();
    } catch (e) {
      console.log(`Error for ${url.slice(0, 80)}: ${e}`);
    }
  }

  await browser.close();
}

main().catch(console.error);
