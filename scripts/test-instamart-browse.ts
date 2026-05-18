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

  const captured: { url: string; status: number; size: number; rateLimit: string }[] = [];
  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("swiggy.com/api/instamart")) return;
    const rateLimit = res.headers()["x-rate-limit"] ?? "";
    try {
      const text = await res.text();
      captured.push({ url, status: res.status(), size: text.length, rateLimit });
      console.log(`[${res.status()}] ${url.slice(0, 100)}`);
      if (rateLimit) console.log(`  ⚠️  x-rate-limit: ${rateLimit}`);
      console.log(`  body: ${text.length > 5 ? "✅ " + text.length + " bytes" : "❌ EMPTY"}\n`);
      if (text.length > 1000 && !url.includes("home/v2") && !url.includes("cart") && !url.includes("footer")) {
        fs.writeFileSync(".instamart-browse-data.json", text);
        console.log("  💾 SAVED new endpoint!\n");
      }
    } catch {}
  });

  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);

  // Find category links on the home page and click one
  const categories = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a[href*='instamart']"));
    return links.slice(0, 10).map(a => ({
      text: a.textContent?.trim().slice(0, 50),
      href: a.getAttribute("href"),
    })).filter(l => l.href && !l.href.includes("search"));
  });
  console.log("Category links found:", categories.length);
  categories.forEach(c => console.log(" ", JSON.stringify(c)));

  // Click the first category link
  if (categories.length > 0) {
    console.log(`\nNavigating to ${categories[0].href}...`);
    await page.goto(`https://www.swiggy.com${categories[0].href}`, {
      waitUntil: "domcontentloaded", timeout: 30000
    });
    await page.waitForTimeout(5000);
    console.log("URL:", page.url());
    await page.screenshot({ path: "instamart-browse.png" });
    console.log("📸 instamart-browse.png");
  }

  await browser.close();
}

main().catch(console.error);
