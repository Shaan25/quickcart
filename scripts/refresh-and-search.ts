/**
 * Navigates to Blinkit's search page and captures the API response
 * the browser fetches automatically — no manual API calls.
 *
 * Run: npx tsx scripts/refresh-and-search.ts "red bull"
 */

import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";

chromium.use(StealthPlugin());

const SEARCH_QUERY = process.argv[2] || "red bull";

interface BlinkitProduct {
  name: string;
  brand: string;
  variant: string;
  price: number;
  mrp: number | null;
  isAvailable: boolean;
}

function getText(f: unknown): string {
  if (!f) return "";
  if (typeof f === "string") return f;
  return String((f as { text?: unknown }).text ?? "");
}

async function main() {
  console.log(`🔍 Searching Blinkit for "${SEARCH_QUERY}"...`);

  const SESSION_FILE = ".blinkit-session-state.json";
  if (!fs.existsSync(SESSION_FILE)) {
    console.error("❌ No saved session found. Run this first:\n   npx tsx scripts/setup-location.ts");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: SESSION_FILE });
  const page = await context.newPage();

  let searchData: Record<string, unknown> | null = null;

  // Capture the search API response the browser fetches automatically
  page.on("response", async (res) => {
    if (
      !searchData &&
      res.url().includes("blinkit.com/v1/layout/search") &&
      res.url().includes("search_type")
    ) {
      try {
        searchData = await res.json();
      } catch {}
    }
  });

  try {
    // Navigating here causes Blinkit to call v1/layout/search automatically
    await page.goto(
      `https://blinkit.com/s/?q=${encodeURIComponent(SEARCH_QUERY)}`,
      { waitUntil: "domcontentloaded", timeout: 30000 }
    );
    await page.waitForTimeout(5000);

    // Read delivery address from the page header
    const location = await page.evaluate(() => {
      const el = document.querySelector('[class*="HeaderContainer"] [class*="address"], [class*="delivery"] [class*="address"], .tw-truncate');
      return el?.textContent?.trim() ?? null;
    });
    if (location) console.log(`📍 Delivery location: ${location}`);

    if (!searchData) {
      throw new Error("No search response captured — try setting your delivery location first by running with headless: false");
    }

    const snippets: unknown[] = (searchData as Record<string, unknown> & { response: { snippets: unknown[] } }).response?.snippets ?? [];

    const products: BlinkitProduct[] = snippets
      .map((s: unknown) => {
        const d = (s as { data?: Record<string, unknown> }).data;
        if (!d?.name || !d?.normal_price) return null;
        const price = parseInt(getText(d.normal_price).replace(/[₹,\s]/g, "")) || 0;
        if (!price) return null;
        const mrpRaw = getText((d.offer as Record<string, unknown>)?.mrp);
        const mrp = mrpRaw ? parseInt(mrpRaw.replace(/[₹,\s]/g, "")) || null : null;
        return {
          name: getText(d.name),
          brand: getText(d.brand_name),
          variant: getText(d.variant),
          price,
          mrp: mrp && mrp > price ? mrp : null,
          isAvailable: !(d.is_sold_out as boolean),
        } as BlinkitProduct;
      })
      .filter(Boolean) as BlinkitProduct[];

    if (products.length === 0) {
      console.log("No products found — Red Bull may be out of stock in your area.");
    } else {
      console.log(`\n✅ ${products.length} results from Blinkit:\n`);
      products.forEach((p) => {
        const mrp = p.mrp ? `  (MRP ₹${p.mrp})` : "";
        const stock = p.isAvailable ? "" : "  ❌ OOS";
        const displayName = p.name.startsWith(p.brand) ? p.name : `${p.brand} ${p.name}`;
      console.log(`  • ${displayName}  |  ${p.variant}  |  ₹${p.price}${mrp}${stock}`);
      });
    }

  } catch (err) {
    console.error("❌", (err as Error).message);
  }

  await browser.close();
}

main().catch(console.error);
