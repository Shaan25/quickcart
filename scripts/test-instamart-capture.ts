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

  let searchData: unknown = null;

  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("swiggy.com/api/instamart")) return;
    const ct = res.headers()["content-type"] ?? "";
    if (!ct.includes("json")) return;
    try {
      const json = await res.json();
      const keys = typeof json === "object" && json ? Object.keys(json) : [];
      console.log(`[${res.status()}] ${url.slice(0, 120)}`);
      console.log(`  keys: ${keys.join(", ")}\n`);

      if (url.includes("search/mart/v2")) {
        searchData = json;
        fs.writeFileSync(".instamart-mart-response.json", JSON.stringify(json, null, 2));
        console.log("  💾 MART RESPONSE SAVED!\n");
      }
      if (url.includes("suggest-items")) {
        fs.writeFileSync(".instamart-suggest-response.json", JSON.stringify(json, null, 2));
        console.log("  💾 SUGGEST RESPONSE SAVED!\n");
      }
    } catch {}
  });

  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  await page.click("._26Y-T");
  await page.waitForTimeout(800);
  const input = page.locator('input[type="search"]').first();
  await input.click();

  console.log("Typing 'red bull'...");
  await page.keyboard.type("red bull", { delay: 150 });
  await page.waitForTimeout(3000);

  console.log("Pressing Enter...");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(8000);

  console.log("Current URL:", page.url());
  await page.screenshot({ path: "instamart-final.png" });
  console.log("📸 instamart-final.png");

  await browser.close();
}

main().catch(console.error);
