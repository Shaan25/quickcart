import type { PlatformAdapter, RawProduct, LocationCoords } from "../lib/types";
import { getBrowser } from "../lib/browser";
import { bigbasketProducts } from "../data/bigbasket";
import { scoreMatch } from "../lib/fuzzySearch";

async function fetchFromBigbasketLive(query: string): Promise<RawProduct[]> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    extraHTTPHeaders: {
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-IN,en;q=0.9",
      "Referer": "https://www.bigbasket.com/",
    },
  });

  const page = await context.newPage();
  const allProducts: RawProduct[] = [];
  let resolved = false;

  page.on("response", async (res: import("playwright").Response) => {
    if (resolved) return;
    if (!res.url().includes("listing-svc/v2/products")) return;
    if (res.status() !== 200) return;
    const ct = res.headers()["content-type"] ?? "";
    if (!ct.includes("application/json")) return;

    try {
      const json = await res.json() as Record<string, unknown>;
      const tabs = (json.tabs as Array<{ product_info?: { products?: unknown[] } }>) ?? [];
      const items = tabs[0]?.product_info?.products ?? [];
      if (!Array.isArray(items) || !items.length) return;

      items.forEach((it, i) => {
        const item = it as Record<string, unknown>;
        const rawName = String(item.desc ?? "");
        if (!rawName) return;

        const pricing = item.pricing as Record<string, unknown> | undefined;
        const discount = pricing?.discount as Record<string, unknown> | undefined;
        const primPrice = discount?.prim_price as Record<string, unknown> | undefined;
        const price = Number(primPrice?.sp ?? 0);
        if (!price) return;

        const mrpRaw = Number(discount?.mrp ?? 0);
        const mrp = mrpRaw > price ? mrpRaw : undefined;

        const brandObj = item.brand as Record<string, unknown> | undefined;
        const brand = String(brandObj?.name ?? "");
        const name = brand && rawName.toLowerCase().startsWith(brand.toLowerCase())
          ? rawName.slice(brand.length).trim()
          : rawName;

        const size = String(item.w ?? "");
        const images = item.images as Array<{ m?: string; s?: string }> | undefined;
        const imageUrl = images?.[0]?.m || images?.[0]?.s || undefined;
        const avail = item.availability as Record<string, unknown> | undefined;
        const availability = avail?.avail_status === "001" || avail?.button === "Add";

        allProducts.push({
          id: `bb_live_${allProducts.length + i}`,
          name, brand, size, unit: size, price, mrp, availability,
          imageUrl: imageUrl?.startsWith("http") ? imageUrl : undefined,
          category: inferCategory(rawName),
          platform: "bigbasket",
        });
      });

      if (allProducts.length > 0) {
        resolved = true;
        console.log(`[BigBasket] Got ${allProducts.length} live products for "${query}"`);
      }
    } catch {}
  });

  try {
    await page.goto(`https://www.bigbasket.com/ps/?q=${encodeURIComponent(query)}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(7000);
    console.log(`[BigBasket] Finished scraping. Products found: ${allProducts.length}`);
  } finally {
    await context.close();
  }

  return allProducts;
}

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

function fetchFromMock(query: string): RawProduct[] {
  const normalizedQuery = query.toLowerCase().trim();
  return bigbasketProducts.filter((product) => {
    const searchText = `${product.brand} ${product.name} ${product.size} ${product.category}`;
    return scoreMatch(normalizedQuery, searchText) >= 0.35;
  });
}

function withLiveTimeout(query: string, ms: number): Promise<RawProduct[]> {
  return Promise.race([
    fetchFromBigbasketLive(query),
    new Promise<RawProduct[]>((_, reject) =>
      setTimeout(() => reject(new Error("live timeout")), ms)
    ),
  ]);
}

class BigbasketAdapter implements PlatformAdapter {
  platform = "bigbasket" as const;

  async search(query: string, _location?: LocationCoords): Promise<RawProduct[]> {
    try {
      const live = await withLiveTimeout(query, 20000);
      if (live.length > 0) return live;
      console.warn("[BigbasketAdapter] Live returned 0, falling back to mock");
      return fetchFromMock(query);
    } catch (err) {
      console.warn("[BigbasketAdapter] Live scraping failed or timed out, falling back to mock:", (err as Error).message);
      return fetchFromMock(query);
    }
  }

  async getById(id: string): Promise<RawProduct | null> {
    return bigbasketProducts.find((p) => p.id === id) ?? null;
  }
}

export const bigbasketAdapter = new BigbasketAdapter();
