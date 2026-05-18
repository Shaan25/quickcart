import type { PlatformAdapter, RawProduct, LocationCoords } from "../lib/types";
import { getBrowser } from "../lib/browser";
import { blinkitProducts } from "../data/blinkit";
import { scoreMatch } from "../lib/fuzzySearch";
import * as fs from "fs";
import * as path from "path";

const SESSION_FILE = path.join(process.cwd(), ".blinkit-session-state.json");

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
  const browser = await getBrowser();
  const hasSession = fs.existsSync(SESSION_FILE);
  const context = hasSession
    ? await browser.newContext({ storageState: SESSION_FILE, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" })
    : await browser.newContext({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" });

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
  const allProducts: RawProduct[] = [];

  try {
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("blinkit.com/v1/layout/search") && res.url().includes("search_type"),
      { timeout: 15000 }
    ).catch(() => null);

    await page.goto(`https://blinkit.com/s/?q=${encodeURIComponent(query)}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const response = await responsePromise;

    if (response) {
      const searchData = await response.json() as Record<string, unknown>;
      const snippets: unknown[] = (searchData as { response?: { snippets?: unknown[] } }).response?.snippets ?? [];

      snippets.forEach((s, i) => {
        const d = (s as { data?: Record<string, unknown> }).data;
        if (!d?.name || !d?.normal_price) return;
        const price = parseInt(getText(d.normal_price).replace(/[₹,\s]/g, "")) || 0;
        if (!price) return;
        const mrpRaw = getText((d.offer as Record<string, unknown>)?.mrp);
        const mrp = mrpRaw ? parseInt(mrpRaw.replace(/[₹,\s]/g, "")) || undefined : undefined;
        const brand = getText(d.brand_name);
        const rawName = getText(d.name);
        const name = rawName.startsWith(brand) ? rawName.slice(brand.length).trim() : rawName;
        const size = getText(d.variant);
        const imageObj = d.image as Record<string, unknown> | undefined;
        const imageUrl = (imageObj?.url as string | undefined) || undefined;
        allProducts.push({ id: `bk_live_${i}`, name, brand, size, unit: size, price, mrp, availability: !(d.is_sold_out as boolean), imageUrl, category: inferCategory(name), platform: "blinkit" });
      });
    }

    console.log(`[Blinkit] Products found: ${allProducts.length}`);
  } finally {
    await context.close();
  }

  return allProducts;
}

function fetchFromMock(query: string): RawProduct[] {
  const normalizedQuery = query.toLowerCase().trim();
  return blinkitProducts.filter((product) => {
    const searchText = `${product.brand} ${product.name} ${product.size} ${product.category}`;
    return scoreMatch(normalizedQuery, searchText) >= 0.35;
  });
}

function withLiveTimeout(query: string, location: LocationCoords | undefined, ms: number): Promise<RawProduct[]> {
  return Promise.race([
    fetchFromBlinkit(query, location),
    new Promise<RawProduct[]>((_, reject) =>
      setTimeout(() => reject(new Error("live timeout")), ms)
    ),
  ]);
}

class BlinkitAdapter implements PlatformAdapter {
  platform = "blinkit" as const;

  async search(query: string, location?: LocationCoords): Promise<RawProduct[]> {
    try {
      const live = await withLiveTimeout(query, location, 20000);
      if (live.length > 0) return live;
      console.warn("[BlinkitAdapter] Live returned 0, falling back to mock");
      return fetchFromMock(query);
    } catch (err) {
      console.warn("[BlinkitAdapter] Live scraping failed or timed out, falling back to mock:", (err as Error).message);
      return fetchFromMock(query);
    }
  }

  async getById(_id: string): Promise<RawProduct | null> {
    return null;
  }
}

export const blinkitAdapter = new BlinkitAdapter();
