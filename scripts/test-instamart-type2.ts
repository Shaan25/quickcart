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

  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("swiggy.com") || url.includes("media-assets") || url.includes("fna.swiggy")) return;
    const ct = res.headers()["content-type"] ?? "";
    if (!ct.includes("application/json")) return;
    try {
      const json = await res.json();
      const keys = typeof json === "object" && json ? Object.keys(json) : [];
      console.log(`[${res.status()}] ${url.slice(0, 120)}`);
      console.log(`  keys: ${keys.join(", ")}`);
      if (url.includes("search") || url.includes("Search")) {
        fs.writeFileSync(".instamart-search-response.json", JSON.stringify(json, null, 2));
        console.log("  💾 SEARCH RESPONSE SAVED");
      }
      console.log();
    } catch {}
  });

  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);

  // Dump all input elements and their attributes
  const inputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input")).map((el) => ({
      type: el.type,
      placeholder: el.placeholder,
      className: el.className.slice(0, 60),
      name: el.name,
      id: el.id,
      visible: el.offsetParent !== null,
    }))
  );
  console.log("All inputs on page:");
  inputs.forEach((inp, i) => console.log(`  [${i}]`, JSON.stringify(inp)));

  await browser.close();
}

main().catch(console.error);
