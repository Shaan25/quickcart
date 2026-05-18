import type { PlatformAdapter, RawProduct, LocationCoords } from "../lib/types";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { jiomartProducts } from "../data/jiomart";
import { scoreMatch } from "../lib/fuzzySearch";

// @ts-ignore
chromium.use(StealthPlugin());

function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("milk") || n.includes("curd") || n.includes("paneer") || n.includes("butter") || n.includes("cheese")) return "dairy";
  if (n.includes("energy") || n.includes("cola") || n.includes("juice") || n.includes("drink") || n.includes("water") || n.includes("tea") || n.includes("coffee")) return "beverages";
  if (n.includes("chips") || n.includes("biscuit") || n.includes("namkeen") || n.includes("snack") || n.includes("nuts") || n.includes("bhujia")) return "snacks";
  if (n.includes("egg")) return "eggs";
  if (n.includes("bread") || n.includes("roti") || n.includes("cake")) return "bakery";
  if (n.includes("maggi") || n.includes("noodle") || n.includes("pasta")) return "instant_food";
  if (n.includes("soap") || n.includes("shampoo") || n.includes("detergent") || n.includes("wash")) return "personal_care";
  if (n.includes("chocolate") || n.includes("dairy milk") || n.includes("kitkat")) return "chocolates";
  return "grocery";
}

async function fetchFromJiomartLive(query: string, location?: LocationCoords): Promise<RawProduct[]> {
  const browser = await (chromium as unknown as { launch: (opts: object) => Promise<import("playwright").Browser> }).launch({ headless: true });
  const context = await (browser as import("playwright").Browser).newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();
  const allProducts: RawProduct[] = [];
  let resolved = false;

  page.on("response", async (res) => {
    if (resolved) return;
    const url = res.url();
    if (!url.includes("jiomart.com")) return;
    if (res.status() !== 200) return;
    const ct = res.headers()["content-type"] ?? "";
    if (!ct.includes("application/json")) return;

    try {
      const json = await res.json() as Record<string, unknown>;
      const items = (json.items ?? json.products ?? json.data) as unknown[] | undefined;
      if (!Array.isArray(items) || !items.length) return;

      items.forEach((it, i) => {
        const item = it as Record<string, unknown>;
        const rawName = String(item.name ?? item.product_name ?? "");
        if (!rawName) return;

        const price = Number(item.special_price ?? item.price ?? item.selling_price ?? 0);
        if (!price) return;
        const mrpRaw = Number(item.price ?? item.mrp ?? 0);
        const mrp = mrpRaw > price ? mrpRaw : undefined;

        const brand = String(item.brand ?? item.brand_name ?? "");
        const name = brand && rawName.toLowerCase().startsWith(brand.toLowerCase())
          ? rawName.slice(brand.length).trim()
          : rawName;

        const size = String(item.unit ?? item.pack_size ?? item.weight ?? "");
        const imageUrl = String(item.image ?? item.thumbnail ?? item.small_image ?? "") || undefined;

        allProducts.push({
          id: `jm_live_${allProducts.length + i}`,
          name,
          brand,
          size,
          unit: size,
          price,
          mrp,
          availability: item.is_in_stock !== false && item.stock_status !== "OUT_OF_STOCK",
          imageUrl: imageUrl?.startsWith("http") ? imageUrl : undefined,
          category: inferCategory(rawName),
          platform: "jiomart",
        });
      });

      if (allProducts.length > 0) {
        resolved = true;
        console.log(`[JioMart] Got ${allProducts.length} live products for "${query}"`);
      }
    } catch {}
  });

  try {
    const searchUrl = `https://www.jiomart.com/catalogsearch/result/?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(6000);
    console.log(`[JioMart] Finished scraping. Products found: ${allProducts.length}`);
  } finally {
    await browser.close();
  }

  return allProducts;
}

function fetchFromMock(query: string): RawProduct[] {
  const normalizedQuery = query.toLowerCase().trim();
  return jiomartProducts.filter((product) => {
    const searchText = `${product.brand} ${product.name} ${product.size} ${product.category}`;
    return scoreMatch(normalizedQuery, searchText) >= 0.5;
  });
}

class JiomartAdapter implements PlatformAdapter {
  platform = "jiomart" as const;

  async search(query: string, location?: LocationCoords): Promise<RawProduct[]> {
    try {
      const live = await fetchFromJiomartLive(query, location);
      if (live.length > 0) return live;
      if (location) return [];
      console.warn("[JiomartAdapter] Live returned 0 results, falling back to mock data");
      return fetchFromMock(query);
    } catch (err) {
      console.error("[JiomartAdapter] Live scraping failed, falling back to mock:", err);
      if (location) return [];
      return fetchFromMock(query);
    }
  }

  async getById(id: string): Promise<RawProduct | null> {
    return jiomartProducts.find((p) => p.id === id) ?? null;
  }
}

export const jiomartAdapter = new JiomartAdapter();
