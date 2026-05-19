import type { PlatformAdapter, RawProduct, LocationCoords } from "../lib/types";
import { getBrowser, stealthPage } from "../lib/browser";
import * as fs from "fs";
import * as path from "path";

const SESSION_FILE = path.join(process.cwd(), ".zepto-session-state.json");

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

async function fetchFromZepto(query: string, location?: LocationCoords): Promise<RawProduct[]> {
  const browser = await getBrowser();
  const hasSession = fs.existsSync(SESSION_FILE);
  const context = hasSession
    ? await browser.newContext({ storageState: SESSION_FILE, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" })
    : await browser.newContext({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" });

  // Default to Bengaluru if no location provided — Zepto needs coords to serve products
  const loc = location ?? { lat: 12.9716, lng: 77.5946 };
  await context.addCookies([
    { name: "latitude",  value: String(loc.lat), domain: ".zeptonow.com", path: "/" },
    { name: "longitude", value: String(loc.lng), domain: ".zeptonow.com", path: "/" },
  ]);

  const page = await context.newPage();
  await stealthPage(page);
  const allProducts: RawProduct[] = [];

  try {
    let capturedBody: string | null = null;
    page.on("response", async (res) => {
      if (
        res.url().includes("bff-gateway.zepto.com/user-search-service/api/v3/search") &&
        !res.url().includes("/filters") &&
        res.status() === 200 &&
        !capturedBody
      ) {
        capturedBody = await res.text().catch(() => null);
      }
    });

    await page.goto(`https://www.zepto.com/search?query=${encodeURIComponent(query)}`, { waitUntil: "domcontentloaded", timeout: 18000 });
    // Poll up to 8s; exit early once response is captured
    for (let i = 0; i < 40 && !capturedBody; i++) await page.waitForTimeout(200);

    if (capturedBody) {
      const json = JSON.parse(capturedBody) as Record<string, unknown>;
      const layout = (json.layout as unknown[]) ?? [];

      for (const widget of layout) {
        const w = widget as Record<string, unknown>;
        const resolver = ((w.data as Record<string, unknown>)?.resolver as Record<string, unknown>) ?? {};
        if (resolver.type !== "product_grid") continue;

        const items = ((resolver.data as Record<string, unknown>)?.items as unknown[]) ?? [];
        items.forEach((it, i) => {
          const productResponse = ((it as Record<string, unknown>).productResponse ?? {}) as Record<string, unknown>;
          const product = (productResponse.product ?? {}) as Record<string, unknown>;
          const productVariant = (productResponse.productVariant ?? {}) as Record<string, unknown>;

          const rawName = String(product.name ?? "");
          const brand = String(product.brand ?? "");
          if (!rawName || !productResponse.sellingPrice) return;

          const price = Math.round(Number(productResponse.sellingPrice) / 100);
          if (!price) return;
          const mrpRaw = Number(productResponse.mrp);
          const mrp = mrpRaw ? Math.round(mrpRaw / 100) : undefined;
          const size = String(productVariant.formattedPacksize ?? "");
          const name = rawName.startsWith(brand) ? rawName.slice(brand.length).trim() : rawName;
          const variantImages = productVariant.images as Array<{ path?: string }> | undefined;
          const imagePath = variantImages?.[0]?.path;
          const imageUrl = imagePath ? `https://cdn.zeptonow.com/production/tr:w-200,f-auto,q-80/${imagePath}` : undefined;

          allProducts.push({ id: `zt_live_${i}`, name, brand, size, unit: size, price, mrp, availability: !(productResponse.outOfStock as boolean), imageUrl, category: inferCategory(rawName), platform: "zepto" });
        });
      }
    }

    console.log(`[Zepto] Products found: ${allProducts.length}`);
  } finally {
    await context.close();
  }

  return allProducts;
}

class ZeptoAdapter implements PlatformAdapter {
  platform = "zepto" as const;

  async search(query: string, location?: LocationCoords): Promise<RawProduct[]> {
    try {
      return await fetchFromZepto(query, location);
    } catch (err) {
      console.error("[ZeptoAdapter] Live scraping failed:", (err as Error).message);
      return [];
    }
  }

  async getById(_id: string): Promise<RawProduct | null> {
    return null;
  }
}

export const zeptoAdapter = new ZeptoAdapter();
