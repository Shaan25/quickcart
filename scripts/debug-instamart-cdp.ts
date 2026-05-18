import { chromium } from "playwright";
import * as fs from "fs";

async function main() {
  console.log("Connecting to Chrome...");
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = browser.contexts()[0];
  if (!context) { console.log("No context"); return; }

  const page = await context.newPage();

  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("swiggy.com/api/instamart")) return;
    const rateLimit = res.headers()["x-rate-limit"] ?? "";
    try {
      const text = await res.text();
      console.log(`[${res.status()}] ${url.slice(0, 100)}`);
      if (rateLimit) console.log(`  ⚠️  x-rate-limit: ${rateLimit}`);
      console.log(`  body: ${text.length > 5 ? "✅ " + text.length + " bytes" : "❌ EMPTY"}`);
      if (text.length > 10) {
        console.log(`  preview: ${text.slice(0, 150)}`);
        if (url.includes("suggest") || url.includes("mart/v2") || url.includes("search")) {
          fs.writeFileSync(`.instamart-cdp-${Date.now()}.json`, text);
          console.log("  💾 SAVED");
        }
      }
      console.log();
    } catch {}
  });

  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);

  await page.click("._26Y-T", { force: true }).catch(() => console.log("search button not found"));
  await page.waitForTimeout(800);

  const input = page.locator('input[type="search"]').first();
  if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
    await input.click();
    await page.keyboard.type("red bull", { delay: 150 });
    console.log("Typed 'red bull', waiting for API...");
    await page.waitForTimeout(5000);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(5000);
  } else {
    console.log("Search input not visible");
  }

  await page.close();
  console.log("Done");
}

main().catch(console.error);
