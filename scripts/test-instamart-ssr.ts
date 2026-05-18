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

  // Navigate to search page (we know it loads with 200)
  await page.goto(
    "https://www.swiggy.com/instamart/search?query=red+bull",
    { waitUntil: "domcontentloaded", timeout: 30000 }
  );
  await page.waitForTimeout(5000);

  // Get page source and look for embedded JSON data
  const html = await page.content();
  fs.writeFileSync(".instamart-search-ssr.html", html);
  
  // Look for JSON data in script tags
  const scriptData = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll("script"));
    const data: { type: string; content: string }[] = [];
    for (const s of scripts) {
      const text = s.textContent ?? "";
      if (text.includes("price") || text.includes("product") || text.includes("item")) {
        data.push({ type: s.type || "text/javascript", content: text.slice(0, 200) });
      }
    }
    return data;
  });

  console.log("Scripts with price/product data:");
  scriptData.forEach(s => console.log(`  [${s.type}]: ${s.content.slice(0, 100)}`));

  // Check if products are in the DOM
  const products = await page.evaluate(() => {
    // Look for price elements
    const priceEls = Array.from(document.querySelectorAll('[class*="price"], [class*="Price"]'));
    return priceEls.slice(0, 5).map(el => el.textContent?.trim());
  });
  console.log("\nPrice elements in DOM:", products);

  await browser.close();
}

main().catch(console.error);
