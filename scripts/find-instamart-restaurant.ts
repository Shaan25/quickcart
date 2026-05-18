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

  await page.goto("https://www.swiggy.com", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
    const lat = 30.701195;
    const lng = 76.716594;
    
    const res = await fetch(
      `https://www.swiggy.com/dapi/restaurants/list/v5?lat=${lat}&lng=${lng}&is-seo-homepage-enabled=true&page_type=DESKTOP_WEB_LISTING`,
      { headers: { "Accept": "application/json", "Referer": "https://www.swiggy.com/" }, credentials: "include" }
    );
    const json = await res.json();
    
    // Find all restaurant cards
    const widgets = json?.data?.cards ?? [];
    const restaurants: { id: string; name: string; type: string; slugs?: unknown }[] = [];
    
    function findRestaurants(obj: unknown): void {
      if (typeof obj !== "object" || !obj) return;
      const o = obj as Record<string, unknown>;
      if (o.id && o.name && (o.avgRating !== undefined || o.cloudinaryImageId)) {
        restaurants.push({
          id: String(o.id),
          name: String(o.name),
          type: String(o.restaurantType ?? o.availability ?? ""),
        });
      }
      Object.values(o).forEach(findRestaurants);
    }
    
    findRestaurants(widgets);
    return restaurants.filter(r => r.name.toLowerCase().includes("instamart") || r.name.toLowerCase().includes("swiggy"));
  });

  console.log("Instamart/Swiggy restaurants found:", result.length);
  result.forEach(r => console.log(" ", JSON.stringify(r)));

  await browser.close();
}

main().catch(console.error);
