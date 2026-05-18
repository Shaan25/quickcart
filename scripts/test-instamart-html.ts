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

  // Capture ALL responses, not just JSON
  const allResponses: { url: string; status: number; ct: string }[] = [];
  page.on("response", (res) => {
    allResponses.push({ url: res.url(), status: res.status(), ct: res.headers()["content-type"] ?? "" });
  });

  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click search and type
  await page.click("._26Y-T");
  await page.waitForTimeout(800);
  const input = page.locator('input[type="search"]').first();
  await input.click();
  await page.keyboard.type("red bull", { delay: 150 });
  await page.waitForTimeout(3000);

  // Check current URL and page state
  console.log("Current URL:", page.url());
  
  // Find any product-related elements in DOM
  const productText = await page.evaluate(() => {
    const body = document.body.textContent ?? "";
    // Look for price patterns like ₹ or product names
    const hasPrice = body.includes("₹");
    const hasBull = body.toLowerCase().includes("bull");
    return { hasPrice, hasBull, bodyLength: body.length };
  });
  console.log("Page has ₹:", productText.hasPrice, "| has 'bull':", productText.hasBull, "| body length:", productText.bodyLength);

  await page.screenshot({ path: "instamart-after-type-nofill.png" });
  console.log("\nAll responses after typing:");
  allResponses.slice(-20).forEach(r => {
    if (r.url.includes("swiggy.com") && !r.url.includes("media-assets") && !r.url.includes("nr-data")) {
      console.log(`  [${r.status}] ${r.url.slice(0, 100)}`);
    }
  });

  await browser.close();
}

main().catch(console.error);
