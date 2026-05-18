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
    if (!url.includes("swiggy.com/api/instamart")) return;
    const rateLimit = res.headers()["x-rate-limit"] ?? "";
    try {
      const text = await res.text();
      if (!text && !rateLimit) return;
      console.log(`[${res.status()}] ${url.slice(0, 120)}`);
      if (rateLimit) console.log(`  ⚠️  x-rate-limit: ${rateLimit}`);
      console.log(`  body: ${text.length > 5 ? "✅ " + text.length + " bytes" : "❌ EMPTY"}\n`);
      // Save any new working endpoint
      if (text.length > 100 && !url.includes("home/v2") && !url.includes("cart") && !url.includes("footer")) {
        const fname = url.split("/").slice(-3).join("-").replace(/[?&=]/g, "_").slice(0, 50);
        fs.writeFileSync(`.instamart-cat-${fname}.json`, text);
        console.log(`  💾 SAVED as .instamart-cat-${fname}.json\n`);
      }
    } catch {}
  });

  // Try navigating to a category page directly
  console.log("Navigating to beverages/drinks category...");
  await page.goto("https://www.swiggy.com/instamart/category/cold-drinks-juices", {
    waitUntil: "domcontentloaded", timeout: 30000
  });
  await page.waitForTimeout(5000);

  console.log("URL:", page.url());
  await page.screenshot({ path: "instamart-category.png" });
  console.log("📸 instamart-category.png");

  await browser.close();
}

main().catch(console.error);
