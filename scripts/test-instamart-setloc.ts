import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";

chromium.use(StealthPlugin());

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--lang=en-IN"] });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-IN", timezoneId: "Asia/Kolkata", viewport: { width: 1440, height: 900 },
    geolocation: { latitude: 30.701195, longitude: 76.716594 },
    permissions: ["geolocation"],
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
      console.log(`  body: ${text.length > 5 ? "✅ " + text.length : "❌ EMPTY"}\n`);
      if (text.length > 10 && (url.includes("suggest-items") || url.includes("search/mart"))) {
        fs.writeFileSync(`.instamart-setloc-${url.includes("mart") ? "mart" : "suggest"}.json`, text);
        console.log("  💾 SAVED!\n");
      }
    } catch {}
  });

  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);

  await page.screenshot({ path: "instamart-setloc-home.png" });

  // Try to detect and interact with the location modal
  const modalVisible = await page.locator('[aria-label="Close overlay"]').isVisible({ timeout: 2000 }).catch(() => false);
  const useCurrentLoc = page.locator("button", { hasText: /use.*current|allow/i }).first();
  const useCurrentVisible = await useCurrentLoc.isVisible({ timeout: 2000 }).catch(() => false);

  console.log("Modal visible:", modalVisible, "| Use current location button visible:", useCurrentVisible);

  if (useCurrentVisible) {
    console.log("Clicking 'Use current location'...");
    await useCurrentLoc.click({ force: true });
    await page.waitForTimeout(3000);
  } else if (modalVisible) {
    // Try to search for Mohali in the location search
    const locInput = page.locator('input[placeholder*="location"], input[placeholder*="area"], input[type="text"]').first();
    if (await locInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await locInput.fill("Sector 70 Mohali");
      await page.waitForTimeout(2000);
      const firstResult = page.locator('[data-testid*="search-result"], [class*="locationResult"]').first();
      if (await firstResult.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstResult.click();
        await page.waitForTimeout(2000);
      }
    }
  }

  await page.screenshot({ path: "instamart-setloc-after.png" });

  // Now try search
  const searchBtn = page.locator("._26Y-T").first();
  if (await searchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchBtn.click({ force: true });
    await page.waitForTimeout(1000);
    const input = page.locator('input[type="search"]').first();
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.click();
      await page.keyboard.type("red bull", { delay: 150 });
      await page.waitForTimeout(4000);
    }
  }

  await browser.close();
}

main().catch(console.error);
