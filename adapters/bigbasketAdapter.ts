import type { PlatformAdapter, RawProduct, LocationCoords } from "../lib/types";
import { getBrowser } from "../lib/browser";

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

  try {
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("listing-svc/v2/products") && res.status() === 200,
      { timeout: 25000 }
    ).catch(() => null);

    await page.goto(`https://www.bigbasket.com/ps/?q=${encodeURIComponent(query)}`, { waitUntil: "domcontentloaded", timeout: 25000 });
    const response = await responsePromise;

    if (response) {
      const json = await response.json() as Record<string, unknown>;
      const tabs = (json.tabs as Array<{ product_info?: { products?: unknown[] } }>) ?? [];
      const items = tabs[0]?.product_info?.products ?? [];

      if (Array.isArray(items)) {
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
            id: `bb_live_${i}`,
            name, brand, size, unit: size, price, mrp, availability,
            imageUrl: imageUrl?.startsWith("http") ? imageUrl : undefined,
            category: inferCategory(rawName),
            platform: "bigbasket",
          });
        });
      }
    }

    console.log(`[BigBasket] Products found: ${allProducts.length}`);
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

class BigbasketAdapter implements PlatformAdapter {
  platform = "bigbasket" as const;

  async search(query: string, _location?: LocationCoords): Promise<RawProduct[]> {
    try {
      return await fetchFromBigbasketLive(query);
    } catch (err) {
      console.error("[BigbasketAdapter] Live scraping failed:", (err as Error).message);
      return [];
    }
  }

  async getById(_id: string): Promise<RawProduct | null> {
    return null;
  }
}

export const bigbasketAdapter = new BigbasketAdapter();
