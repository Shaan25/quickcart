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

  // Load homepage to set context and cookies
  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Try known search API patterns from within the browser
  const results = await page.evaluate(async () => {
    const storeId = "1403831";
    const query = "red bull";
    const endpoints = [
      `https://www.swiggy.com/api/instamart/search/v1?query=${encodeURIComponent(query)}&storeId=${storeId}&clientId=INSTAMART-APP`,
      `https://www.swiggy.com/api/instamart/v1/search?query=${encodeURIComponent(query)}&storeId=${storeId}`,
      `https://www.swiggy.com/dapi/instamart/search?query=${encodeURIComponent(query)}&storeId=${storeId}`,
      `https://www.swiggy.com/api/instamart/search?query=${encodeURIComponent(query)}&storeId=${storeId}&clientId=INSTAMART-APP`,
      `https://www.swiggy.com/api/instamart/search/v2?query=${encodeURIComponent(query)}&storeId=${storeId}&clientId=INSTAMART-APP`,
    ];

    const out: { url: string; status: number; keys: string[]; snippet: string }[] = [];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Referer": "https://www.swiggy.com/instamart",
          },
          credentials: "include",
        });
        let keys: string[] = [];
        let snippet = "";
        try {
          const json = await res.json();
          keys = Object.keys(json);
          snippet = JSON.stringify(json).slice(0, 200);
        } catch {}
        out.push({ url, status: res.status, keys, snippet });
      } catch (e) {
        out.push({ url, status: -1, keys: [], snippet: String(e) });
      }
    }
    return out;
  });

  results.forEach(r => {
    console.log(`[${r.status}] ${r.url.slice(0, 100)}`);
    if (r.keys.length > 0) console.log(`  keys: ${r.keys.join(", ")}`);
    if (r.snippet) console.log(`  snippet: ${r.snippet.slice(0, 150)}`);
    console.log();
  });

  await browser.close();
}

main().catch(console.error);
