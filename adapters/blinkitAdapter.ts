import type { PlatformAdapter, RawProduct, LocationCoords } from "../lib/types";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";
import * as path from "path";

const SESSION_FILE = path.join(process.cwd(), ".blinkit-session-state.json");

// @ts-ignore
chromium.use(StealthPlugin());

function getText(f: unknown): string {
  if (!f) return "";
  if (typeof f === "string") return f;
  return String((f as { text?: unknown }).text ?? "");
}

function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("milk") || n.includes("curd") || n.includes("paneer") || n.includes("butter") || n.includes("cheese")) return "dairy";
  if (n.includes("energy") || n.includes("cola") || n.includes("juice") || n.includes("drink") || n.includes("water")) return "beverages";
  if (n.includes("chips") || n.includes("biscuit") || n.includes("namkeen") || n.includes("snack") || n.includes("nuts")) return "snacks";
  if (n.includes("egg")) return "eggs";
  if (n.includes("bread") || n.includes("roti") || n.includes("cake")) return "bakery";
  if (n.includes("maggi") || n.includes("noodle") || n.includes("pasta")) return "instant_food";
  if (n.includes("soap") || n.includes("shampoo") || n.includes("detergent") || n.includes("wash")) return "personal_care";
  return "grocery";
}

async function fetchFromBlinkit(query: string, location?: LocationCoords): Promise<RawProduct[]> {
  const browser = await (chromium as unknown as { launch: (opts: object) => Promise<import("playwright").Browser> }).launch({ headless: true });
  const hasSession = fs.existsSync(SESSION_FILE);
  const context = hasSession
    ? await (browser as import("playwright").Browser).newContext({ storageState: SESSION_FILE })
    : await (browser as import("playwright").Browser).newContext();

  if (location) {
    const city = location.city ?? location.label ?? "";
    await context.addCookies([
      { name: "gr_1_lat",      value: String(location.lat), domain: "blinkit.com", path: "/" },
      { name: "gr_1_lon",      value: String(location.lng), domain: "blinkit.com", path: "/" },
      { name: "gr_1_locality", value: city,                 domain: "blinkit.com", path: "/" },
      { name: "city",          value: city,                 domain: ".blinkit.com", path: "/" },
    ]);
  }

  const page = await context.newPage();

  let searchData: Record<string, unknown> | null = null;

  page.on("response", async (res) => {
    if (
      !searchData &&
      res.url().includes("blinkit.com/v1/layout/search") &&
      res.url().includes("search_type")
    ) {
      try { searchData = await res.json(); } catch {}
    }
  });

  try {
    await page.goto(
      `https://blinkit.com/s/?q=${encodeURIComponent(query)}`,
      { waitUntil: "domcontentloaded", timeout: 30000 }
    );
    await page.waitForTimeout(5000);

    const location = await page.evaluate(() => {
      const el = document.querySelector('.tw-truncate, [class*="address"]');
      return el?.textContent?.trim() ?? null;
    });
    if (location) console.log(`[Blinkit] Delivery location: ${location}`);
  } finally {
    await browser.close();
  }

  if (!searchData) return [];

  const resp = (searchData as { response?: { snippets?: unknown[] } }).response;
  const snippets: unknown[] = resp?.snippets ?? [];

  return snippets
    .map((s, i): RawProduct | null => {
      const d = (s as { data?: Record<string, unknown> }).data;
      if (!d?.name || !d?.normal_price) return null;

      const priceText = getText(d.normal_price);
      const price = parseInt(priceText.replace(/[₹,\s]/g, "")) || 0;
      if (!price) return null;

      const mrpRaw = getText((d.offer as Record<string, unknown>)?.mrp);
      const mrp = mrpRaw ? parseInt(mrpRaw.replace(/[₹,\s]/g, "")) || undefined : undefined;

      const brand = getText(d.brand_name);
      const rawName = getText(d.name);
      // Strip brand prefix from name if duplicated (e.g. "Red Bull Red Bull Energy...")
      const name = rawName.startsWith(brand) ? rawName.slice(brand.length).trim() : rawName;
      const size = getText(d.variant);

      const imageObj = d.image as Record<string, unknown> | undefined;
      const imageUrl = (imageObj?.url as string | undefined) || undefined;

      return {
        id: `bk_live_${i}`,
        name,
        brand,
        size,
        unit: size,
        price,
        mrp,
        availability: !(d.is_sold_out as boolean),
        imageUrl,
        category: inferCategory(name),
        platform: "blinkit",
      };
    })
    .filter(Boolean) as RawProduct[];
}

class BlinkitAdapter implements PlatformAdapter {
  platform = "blinkit" as const;

  async search(query: string, location?: LocationCoords): Promise<RawProduct[]> {
    try {
      return await fetchFromBlinkit(query, location);
    } catch (err) {
      console.error("[BlinkitAdapter] scrape failed:", err);
      return [];
    }
  }

  async getById(_id: string): Promise<RawProduct | null> {
    return null;
  }
}

export const blinkitAdapter = new BlinkitAdapter();
