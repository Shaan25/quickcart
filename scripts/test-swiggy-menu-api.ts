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

  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("swiggy.com/dapi") && !url.includes("swiggy.com/api/instamart")) return;
    const rateLimit = res.headers()["x-rate-limit"] ?? "";
    try {
      const text = await res.text();
      if (!text || text.length < 20) return;
      console.log(`[${res.status()}] ${url.slice(0, 100)}`);
      if (rateLimit) console.log(`  x-rate-limit: ${rateLimit}`);
      console.log(`  body: ✅ ${text.length} bytes\n`);
      if (url.includes("instamart") && text.length > 1000) {
        fs.writeFileSync(".instamart-dapi.json", text);
      }
    } catch {}
  });

  // Try the main Swiggy dapi to find Instamart store
  await page.goto("https://www.swiggy.com", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Call Swiggy dapi to find Instamart restaurant
  const result = await page.evaluate(async () => {
    const lat = 30.701195;
    const lng = 76.716594;
    
    // Try restaurant listing API
    const urls = [
      `https://www.swiggy.com/dapi/restaurants/list/v5?lat=${lat}&lng=${lng}&is-seo-homepage-enabled=true&page_type=DESKTOP_WEB_LISTING`,
      `https://www.swiggy.com/dapi/instamart/home?lat=${lat}&lng=${lng}`,
    ];
    
    const results: { url: string; status: number; text: string }[] = [];
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: {
            "Accept": "application/json",
            "Referer": "https://www.swiggy.com/",
          },
          credentials: "include",
        });
        const text = await res.text();
        results.push({ url, status: res.status, text: text.slice(0, 300) });
      } catch (e) {
        results.push({ url, status: -1, text: String(e) });
      }
    }
    return results;
  });

  result.forEach(r => {
    console.log(`[${r.status}] ${r.url.slice(0, 80)}`);
    console.log(`  ${r.text.slice(0, 200)}\n`);
  });

  await browser.close();
}

main().catch(console.error);
