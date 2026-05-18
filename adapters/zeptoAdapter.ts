import type { PlatformAdapter, RawProduct, LocationCoords } from "../lib/types";
import { getBrowser } from "../lib/browser";
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

  if (location) {
    await context.addCookies([
      { name: "latitude",  value: String(location.lat), domain: ".zeptonow.com", path: "/" },
      { name: "longitude", value: String(location.lng), domain: ".zeptonow.com", path: "/" },
    ]);
  }

  const page = await context.newPage();
  const allProducts: RawProduct[] = [];
  let searchResolved = false;

  page.on("response", async (res: import("playwright").Response) => {
    if (searchResolved) return;
    if (!res.url().includes("bff-gateway.zepto.com/user-search-service/api/v3/search")) return;
    if (res.url().includes("/filters")) return;
    try {
      const json = await res.json() as Record<string, unknown>;
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

          allProducts.push({ id: `zt_live_${allProducts.length + i}`, name, brand, size, unit: size, price, mrp, availability: !(productResponse.outOfStock as boolean), imageUrl, category: inferCategory(rawName), platform: "zepto" });
        });
      }
      if (allProducts.length > 0) searchResolved = true;
    } catch {}
  });

  try {
    await page.goto("https://www.zeptonow.com", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.goto(`https://www.zeptonow.com/search?query=${encodeURIComponent(query)}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(6000);
    const loc = await page.evaluate(() => document.querySelector('[class*="address"], [class*="location"]')?.textContent?.trim() ?? null);
    if (loc) console.log(`[Zepto] Delivery location: ${loc}`);
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
      console.error("[ZeptoAdapter] scrape failed:", err);
      return [];
    }
  }

  async getById(_id: string): Promise<RawProduct | null> {
    return null;
  }
}

export const zeptoAdapter = new ZeptoAdapter();
