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

  let restaurantData: unknown = null;
  page.on("response", async (res) => {
    if (res.url().includes("dapi/restaurants/list")) {
      try { restaurantData = await res.json(); } catch {}
    }
  });

  await page.goto("https://www.swiggy.com", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);

  if (restaurantData) {
    fs.writeFileSync(".swiggy-restaurants.json", JSON.stringify(restaurantData, null, 2));
    console.log("✅ Restaurant data saved");
  } else {
    console.log("❌ No restaurant data captured");
  }

  await browser.close();
}

main().catch(console.error);
