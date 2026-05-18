import type { PlatformAdapter, RawProduct, LocationCoords } from "../lib/types";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";
import * as path from "path";
import { instamartProducts } from "../data/instamart";
import { scoreMatch } from "../lib/fuzzySearch";

const SESSION_FILE = path.join(process.cwd(), ".instamart-session-state.json");

// @ts-ignore
chromium.use(StealthPlugin());

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

function parseSwiggyProducts(json: Record<string, unknown>, offset: number): RawProduct[] {
  const products: RawProduct[] = [];

  // Walk the cards tree: data.cards[].card.card.gridElements.infoWithStyle.info[]
  const data = (json.data ?? json) as Record<string, unknown>;
  const cards = (data.cards as unknown[]) ?? [];

  for (const card of cards) {
    const inner = (((card as Record<string, unknown>).card as Record<string, unknown>)?.card ?? {}) as Record<string, unknown>;
    const infoList = ((inner.gridElements as Record<string, unknown>)?.infoWithStyle as Record<string, unknown>)?.info as unknown[] | undefined;
    if (!infoList?.length) continue;

    infoList.forEach((it, i) => {
      const item = it as Record<string, unknown>;
      const rawName = String(item.name ?? "");
      if (!rawName) return;

      // Swiggy prices are in paise (÷100)
      const rawPrice = Number(item.price ?? 0);
      const price = rawPrice > 0 ? rawPrice / 100 : 0;
      if (!price) return;

      const rawMrp = Number(item.defaultPrice ?? 0);
      const mrp = rawMrp > rawPrice ? rawMrp / 100 : undefined;

      const brands = item.brands as Array<Record<string, unknown>> | undefined;
      const brand = String(brands?.[0]?.name ?? "");
      const qty = String((item.itemAttribute as Record<string, unknown>)?.qty ?? "");
      const available = item.isAvailable !== false && !(item.inStock === false);

      const name = brand && rawName.toLowerCase().startsWith(brand.toLowerCase())
        ? rawName.slice(brand.length).trim()
        : rawName;

      products.push({
        id: `im_live_${offset + i}`,
        name,
        brand,
        size: qty,
        unit: qty,
        price,
        mrp,
        availability: available,
        category: inferCategory(rawName),
        platform: "instamart",
      });
    });
  }

  return products;
}

async function fetchFromInstamartLive(query: string, location?: LocationCoords): Promise<RawProduct[]> {
  const browser = await (chromium as unknown as { launch: (opts: object) => Promise<import("playwright").Browser> }).launch({ headless: true });

  // Use saved session for auth (sid, user tokens) but strip the stale aws-waf-token
  // so the browser generates a fresh valid one itself.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let storageState: any = undefined;
  if (fs.existsSync(SESSION_FILE)) {
    const raw = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8")) as {
      cookies: Array<{ name: string; [k: string]: unknown }>;
      origins: unknown[];
    };
    storageState = {
      cookies: raw.cookies, // keep aws-waf-token — fresh session token is valid
      origins: raw.origins,
    };
  }

  const context = await (browser as import("playwright").Browser).newContext(
    storageState ? { storageState } : {}
  );

  const lat = location?.lat ?? 30.701195; // Mohali fallback (from session)
  const lng = location?.lng ?? 76.716594;
  const label = location?.label ?? "";

  // Override userLocation with the user's actual coordinates
  const userLocation = encodeURIComponent(JSON.stringify({
    lat,
    lng,
    address: label,
    id: "",
    annotation: label,
    name: "",
  }));

  await context.addCookies([
    { name: "userLocation", value: userLocation, domain: "www.swiggy.com", path: "/" },
  ]);

  const page = await context.newPage();
  const allProducts: RawProduct[] = [];
  let resolved = false;

  page.on("response", async (res) => {
    if (resolved) return;
    const url = res.url();
    if (!url.includes("swiggy.com")) return;
    const status = res.status();
    const ct = res.headers()["content-type"] ?? "";

    if (status !== 200) return;
    if (!ct.includes("application/json")) return;

    try {
      const json = await res.json() as Record<string, unknown>;
      const parsed = parseSwiggyProducts(json, allProducts.length);
      if (parsed.length > 0) {
        allProducts.push(...parsed);
        resolved = true;
        console.log(`[Instamart] Got ${parsed.length} live products for "${query}" at (${lat},${lng})`);
      }
    } catch {}
  });

  try {
    // Load the Instamart homepage — WAF challenge completes, store is initialized from userLocation
    await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Use the search bar so Swiggy's own routing triggers the search API call
    const searchInput = await page.$('input[placeholder*="earch"], input[type="search"], [data-testid*="search"] input');
    if (searchInput) {
      await searchInput.click();
      await searchInput.fill(query);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(6000);
    } else {
      // Fallback: direct URL navigation
      await page.goto(
        `https://www.swiggy.com/instamart/search?query=${encodeURIComponent(query)}`,
        { waitUntil: "domcontentloaded", timeout: 30000 }
      );
      await page.waitForTimeout(6000);
    }

    console.log(`[Instamart] Finished scraping. Products found: ${allProducts.length}`);
  } finally {
    await browser.close();
  }

  return allProducts;
}

function fetchFromMock(query: string): RawProduct[] {
  const normalizedQuery = query.toLowerCase().trim();
  return instamartProducts.filter((product) => {
    const searchText = `${product.brand} ${product.name} ${product.size} ${product.category}`;
    return scoreMatch(normalizedQuery, searchText) >= 0.5;
  });
}

class InstamartAdapter implements PlatformAdapter {
  platform = "instamart" as const;

  async search(query: string, location?: LocationCoords): Promise<RawProduct[]> {
    try {
      const live = await fetchFromInstamartLive(query, location);
      if (live.length > 0) return live;
      console.warn("[InstamartAdapter] Live returned 0 results, falling back to mock data");
      return fetchFromMock(query);
    } catch (err) {
      console.error("[InstamartAdapter] Live scraping failed, falling back to mock:", err);
      return fetchFromMock(query);
    }
  }

  async getById(id: string): Promise<RawProduct | null> {
    return instamartProducts.find((p) => p.id === id) ?? null;
  }
}

export const instamartAdapter = new InstamartAdapter();
