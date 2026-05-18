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

  const captured: { url: string; data: unknown }[] = [];
  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("swiggy.com") || url.includes("media-assets") || url.includes("fna.swiggy") || url.includes("bam.nr")) return;
    const ct = res.headers()["content-type"] ?? "";
    if (!ct.includes("application/json")) return;
    try {
      const json = await res.json();
      const keys = typeof json === "object" && json ? Object.keys(json) : [];
      console.log(`[${res.status()}] ${url.slice(0, 120)}`);
      console.log(`  keys: ${keys.join(", ")}\n`);
      captured.push({ url, data: json });
    } catch {}
  });

  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);

  // Find elements with search-related text
  const searchEls = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("*"));
    return all
      .filter(el => {
        const ph = el.getAttribute("placeholder") ?? "";
        const role = el.getAttribute("role") ?? "";
        const aria = el.getAttribute("aria-label") ?? "";
        const cls = el.className ?? "";
        return ph.toLowerCase().includes("search") || role === "searchbox" || aria.toLowerCase().includes("search") || (typeof cls === "string" && cls.toLowerCase().includes("search-bar"));
      })
      .slice(0, 10)
      .map(el => ({
        tag: el.tagName,
        placeholder: el.getAttribute("placeholder"),
        role: el.getAttribute("role"),
        ariaLabel: el.getAttribute("aria-label"),
        className: (el.className ?? "").slice(0, 80),
        rect: el.getBoundingClientRect ? { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width) } : null,
      }));
  });
  console.log("Search elements found:");
  searchEls.forEach(e => console.log(" ", JSON.stringify(e)));

  // Try clicking the search area by known header position
  console.log("\nClicking at search bar position (700, 14)...");
  await page.mouse.click(700, 14);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "instamart-after-click.png" });

  // Check if any input appeared after click
  const inputsAfterClick = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input")).map(el => ({
      placeholder: el.placeholder,
      visible: el.offsetParent !== null,
      focused: document.activeElement === el,
    }))
  );
  console.log("Inputs after click:", inputsAfterClick);

  await page.keyboard.type("red bull", { delay: 100 });
  await page.waitForTimeout(2000);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(8000);

  await page.screenshot({ path: "instamart-after-search.png" });
  console.log("\n📸 Screenshots saved");
  console.log("API calls captured:", captured.length);

  // Save all captured data
  fs.writeFileSync(".instamart-all-api.json", JSON.stringify(captured, null, 2));

  await browser.close();
}

main().catch(console.error);
