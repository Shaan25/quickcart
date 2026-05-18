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

  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  const result = await page.evaluate(async () => {
    const storeId = "1403831";
    const query = "red bull";
    const endpoints = [
      `https://www.swiggy.com/api/instamart/search/v1?query=${encodeURIComponent(query)}&storeId=${storeId}&clientId=INSTAMART-APP`,
      `https://www.swiggy.com/api/instamart/search?query=${encodeURIComponent(query)}&storeId=${storeId}&clientId=INSTAMART-APP`,
      `https://www.swiggy.com/api/instamart/search/v2?query=${encodeURIComponent(query)}&storeId=${storeId}&clientId=INSTAMART-APP`,
    ];

    const out: { url: string; status: number; contentType: string; text: string }[] = [];
    for (const url of endpoints) {
      const res = await fetch(url, {
        headers: { "Accept": "application/json", "Referer": "https://www.swiggy.com/instamart" },
        credentials: "include",
      });
      const contentType = res.headers.get("content-type") ?? "";
      const text = await res.text();
      out.push({ url, status: res.status, contentType, text: text.slice(0, 500) });
    }
    return out;
  });

  result.forEach(r => {
    console.log(`[${r.status}] ${r.url}`);
    console.log(`  Content-Type: ${r.contentType}`);
    console.log(`  Body: ${r.text.slice(0, 300)}\n`);
  });

  // Save v2 response in full
  const v2Result = result.find(r => r.url.includes("v2"));
  if (v2Result) fs.writeFileSync(".instamart-v2-response.txt", v2Result.text);

  await browser.close();
}

main().catch(console.error);
