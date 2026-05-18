import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";

chromium.use(StealthPlugin());
const SESSION_FILE = ".instamart-session-state.json";

async function main() {
  const browser = await chromium.launch({
    headless: false,  // visible browser - harder to fingerprint
    args: ["--no-sandbox", "--lang=en-IN", "--window-size=1440,900"],
  });
  const context = await browser.newContext({
    storageState: SESSION_FILE,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-IN", timezoneId: "Asia/Kolkata", viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("swiggy.com/api/instamart")) return;
    const headers = res.headers();
    const rateLimit = headers["x-rate-limit"] ?? "";
    try {
      const text = await res.text();
      console.log(`[${res.status()}] ${url.slice(0, 100)}`);
      if (rateLimit) console.log(`  x-rate-limit: ${rateLimit}`);
      if (text.length > 5) {
        console.log(`  ✅ body length: ${text.length}`);
        if (url.includes("suggest-items") || url.includes("search/mart")) {
          fs.writeFileSync(`.instamart-${url.includes("mart") ? "mart" : "suggest"}.json`, text);
          console.log("  💾 SAVED\n");
        }
      } else {
        console.log("  ❌ body: EMPTY\n");
      }
    } catch {}
  });

  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);

  await page.click("._26Y-T");
  await page.waitForTimeout(1000);
  const input = page.locator('input[type="search"]').first();
  await input.click();
  await page.keyboard.type("red bull", { delay: 150 });
  await page.waitForTimeout(4000);

  console.log("Done");
  await browser.close();
}

main().catch(console.error);
