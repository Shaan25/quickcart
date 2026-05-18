import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";

chromium.use(StealthPlugin());
const SESSION_FILE = ".instamart-session-state.json";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    storageState: SESSION_FILE,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-IN", timezoneId: "Asia/Kolkata", viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const captured: { url: string; data: unknown }[] = [];
  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("swiggy.com/api") && !url.includes("swiggy.com/dapi")) return;
    try {
      const json = await res.json();
      captured.push({ url, data: json });
      if (url.toLowerCase().includes("search")) {
        console.log(`💾 SEARCH: ${url}`);
        fs.writeFileSync(".instamart-search-response.json", JSON.stringify(json, null, 2));
      }
    } catch {}
  });

  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);

  // Get header HTML to find search structure
  const headerHtml = await page.evaluate(() => {
    const header = document.querySelector("header") ?? document.querySelector("nav") ?? document.querySelector('[class*="header"]');
    return header?.innerHTML?.slice(0, 3000) ?? "no header found";
  });
  fs.writeFileSync(".instamart-header.html", headerHtml);
  console.log("Header HTML saved to .instamart-header.html");
  
  // Find the actual search element
  const searchInfo = await page.evaluate(() => {
    // Try to find by text content or visual position
    const allEls = Array.from(document.querySelectorAll("*"));
    const candidates = allEls.filter(el => {
      const rect = el.getBoundingClientRect();
      // Search bar is likely in the top 80px, width > 200px
      return rect.top < 80 && rect.width > 200 && rect.height > 10 && rect.height < 80;
    });
    return candidates.slice(0, 15).map(el => ({
      tag: el.tagName,
      text: el.textContent?.slice(0, 50),
      className: (el.className ?? "").slice(0, 80),
      rect: { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) },
    }));
  });
  console.log("\nElements in top 80px area:");
  searchInfo.forEach(e => console.log(" ", JSON.stringify(e)));

  await browser.close();
}

main().catch(console.error);
