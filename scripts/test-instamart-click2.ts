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
    if (!url.includes("swiggy.com/api") && !url.includes("swiggy.com/dapi")) return;
    try {
      const json = await res.json();
      const keys = Object.keys(json);
      console.log(`[${res.status()}] ${url.slice(0, 120)}`);
      console.log(`  keys: ${keys.join(", ")}\n`);
      if (url.toLowerCase().includes("search")) {
        fs.writeFileSync(".instamart-search-response.json", JSON.stringify(json, null, 2));
        console.log("  💾 SEARCH SAVED!\n");
      }
    } catch {}
  });

  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);

  // Click the search button to open the search modal
  await page.click("._26Y-T");
  await page.waitForTimeout(1000);

  // Now click the search input directly
  const searchInput = page.locator('input[type="search"]').first();
  await searchInput.click();
  await page.waitForTimeout(500);

  console.log("Typing 'red bull'...");
  await searchInput.fill("red bull");
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "instamart-typing.png" });
  console.log("📸 instamart-typing.png");

  // Press Enter on the input
  await searchInput.press("Enter");
  console.log("Pressed Enter, waiting for results...");
  await page.waitForTimeout(10000);

  await page.screenshot({ path: "instamart-results.png" });
  console.log("📸 instamart-results.png");

  await browser.close();
}

main().catch(console.error);
