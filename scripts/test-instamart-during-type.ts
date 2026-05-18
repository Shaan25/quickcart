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

  let martData: unknown = null;

  // Capture ALL swiggy API responses - no content-type filter
  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("swiggy.com/api/instamart")) return;
    console.log(`[${res.status()}] ${url.slice(0, 120)}`);
    console.log(`  headers: ${JSON.stringify(res.headers()).slice(0, 200)}`);
    try {
      const text = await res.text();
      console.log(`  body (first 200): ${text.slice(0, 200)}\n`);
      if (url.includes("search/mart") && text.length > 10) {
        martData = text;
        fs.writeFileSync(".instamart-mart-response.json", text);
        console.log("  💾 MART RESPONSE SAVED!\n");
      }
      if (url.includes("suggest-items") && text.length > 10) {
        fs.writeFileSync(".instamart-suggest-response.json", text);
        console.log("  💾 SUGGEST RESPONSE SAVED!\n");
      }
    } catch (e) {
      console.log(`  error reading: ${e}\n`);
    }
  });

  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  await page.click("._26Y-T");
  await page.waitForTimeout(1000);
  const input = page.locator('input[type="search"]').first();
  await input.click();

  console.log("Typing slowly...");
  await page.keyboard.type("red bull", { delay: 200 });
  
  // Wait for API calls to fire during typing
  console.log("Waiting for API calls after typing...");
  await page.waitForTimeout(5000);

  console.log("\nDone. mart data saved:", !!martData);

  await browser.close();
}

main().catch(console.error);
