import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";

chromium.use(StealthPlugin());

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--lang=en-IN"] });
  const context = await browser.newContext({
    storageState: ".instamart-fresh-session.json",
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
      console.log(`[${res.status()}] ${url.slice(0, 100)}`);
      if (rateLimit) console.log(`  ⚠️  x-rate-limit: ${rateLimit}`);
      console.log(`  body: ${text.length > 5 ? "✅ " + text.length + " bytes" : "❌ EMPTY"}\n`);
      if (text.length > 10 && (url.includes("suggest-items") || url.includes("search/mart"))) {
        fs.writeFileSync(`.instamart-newid-${url.includes("mart") ? "mart" : "suggest"}.json`, text);
        console.log("  💾 SAVED!\n");
      }
    } catch {}
  });

  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);

  await page.click("._26Y-T").catch(async () => {
    console.log("Button click failed, trying force...");
    await page.click("._26Y-T", { force: true });
  });
  await page.waitForTimeout(1000);

  const input = page.locator('input[type="search"]').first();
  if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
    await input.click();
    console.log("Typing...");
    await page.keyboard.type("red bull", { delay: 150 });
    await page.waitForTimeout(4000);
  } else {
    console.log("Search input not visible");
    await page.screenshot({ path: "instamart-newid.png" });
  }

  await browser.close();
}

main().catch(console.error);
