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

  // Open search
  await page.click("._26Y-T");
  await page.waitForTimeout(1000);

  // Type character by character
  console.log("Typing character by character...");
  const searchInput = page.locator('input[type="search"]').first();
  await searchInput.click();
  await page.waitForTimeout(500);
  await page.keyboard.type("red bull", { delay: 150 });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: "instamart-typing2.png" });
  console.log("📸 instamart-typing2.png");

  // Check for suggestions list
  const suggestions = await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll("*"));
    return allEls
      .filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.top > 60 && rect.top < 300 && rect.width > 200 && el.children.length > 0;
      })
      .slice(0, 5)
      .map(el => ({
        tag: el.tagName,
        text: el.textContent?.slice(0, 100),
        cls: (el.className ?? "").slice(0, 60),
      }));
  });
  console.log("Suggestions area:", JSON.stringify(suggestions, null, 2));

  // Press Enter
  await page.keyboard.press("Enter");
  console.log("Pressed Enter, waiting...");
  await page.waitForTimeout(10000);
  await page.screenshot({ path: "instamart-after-enter.png" });
  console.log("📸 instamart-after-enter.png");

  await browser.close();
}

main().catch(console.error);
