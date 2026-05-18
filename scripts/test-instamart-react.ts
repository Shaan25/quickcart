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

  // Use React's nativeInputValueSetter to properly trigger React onChange
  await page.evaluate(() => {
    const input = document.querySelector('input[type="search"]') as HTMLInputElement;
    if (!input) { console.log("no input"); return; }
    
    // Trigger React synthetic events properly
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    nativeInputValueSetter?.call(input, "red bull");
    
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "l" }));
    input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "l" }));
    console.log("Dispatched events, value:", input.value);
  });

  await page.waitForTimeout(3000);
  await page.screenshot({ path: "instamart-react-input.png" });
  console.log("📸 instamart-react-input.png");

  await browser.close();
}

main().catch(console.error);
