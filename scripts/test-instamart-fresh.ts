import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

chromium.use(StealthPlugin());

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--lang=en-IN"] });
  // No session file - completely fresh
  const context = await browser.newContext({
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
      console.log(`  body: ${text.length > 5 ? "✅ " + text.length + " bytes" : "❌ EMPTY"}\n`);
    } catch {}
  });

  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);

  await page.click("._26Y-T").catch(() => {});
  await page.waitForTimeout(1000);
  const input = page.locator('input[type="search"]').first();
  if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
    await input.click();
    await page.keyboard.type("milk", { delay: 150 });
    await page.waitForTimeout(3000);
  }

  await browser.close();
}

main().catch(console.error);
