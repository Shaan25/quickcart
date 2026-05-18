import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";

chromium.use(StealthPlugin());

const SESSION_FILE = ".instamart-session-state.json";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled", "--lang=en-IN"],
  });

  const context = await browser.newContext({
    storageState: SESSION_FILE,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  // Capture all swiggy API calls and save search ones
  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("swiggy.com") || url.includes("media-assets") || url.includes("fna.swiggy") || url.includes("bam.nr")) return;
    const ct = res.headers()["content-type"] ?? "";
    if (!ct.includes("json")) return;
    try {
      const json = await res.json();
      const keys = typeof json === "object" && json ? Object.keys(json) : [];
      console.log(`[${res.status()}] ${url}`);
      console.log(`  keys: ${keys.join(", ")}\n`);
      if (url.includes("search") || url.includes("Search")) {
        fs.writeFileSync(".instamart-search-response.json", JSON.stringify(json, null, 2));
        console.log("  💾 SEARCH SAVED!\n");
      }
    } catch {}
  });

  // Load homepage first to get storeId set in context
  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Try the search URL directly - navigate while cookies are loaded
  console.log("\n--- Navigating to search URL ---");
  await page.goto("https://www.swiggy.com/instamart/search?query=red+bull", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "instamart-search2.png" });
  console.log("📸 instamart-search2.png");

  await browser.close();
}

main().catch(console.error);
