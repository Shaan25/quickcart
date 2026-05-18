/**
 * Calls Blinkit's internal API directly — no browser needed.
 * Headers captured from a real browser session via intercept-blinkit.ts
 *
 * Run: npx tsx scripts/blinkit-api.ts
 *
 * Note: auth_key and session_uuid may expire after a few hours/days.
 * Re-run intercept-blinkit.ts to refresh them.
 */

// ── Paste your captured headers here ──────────────────────────────────────
// Re-run intercept-blinkit.ts if you get 401/403 errors
const BLINKIT_HEADERS: Record<string, string> = {
  "lat":                "30.6816938",
  "lon":                "76.7264148",
  "session_uuid":       "208a4f0d-3c6c-4710-8c8a-0038ea524333",
  "web_app_version":    "1008010016",
  "app_client":         "consumer_web",
  "device_id":          "fcd141f86008c3ce",
  "auth_key":           "c761ec3633c22afad934fb17a66385c1c06c5472b4898b866b7306186d0bb477",
  "app_version":        "1010101010",
  "rn_bundle_version":  "1009003012",
  "content-type":       "application/json",
  "user-agent":         "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
};

interface BlinkitProduct {
  name: string;
  brand: string;
  variant: string;
  price: number;
  mrp: number | null;
  isAvailable: boolean;
}

function extractText(field: unknown): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (typeof field === "object" && field !== null && "text" in field) {
    return String((field as { text: string }).text);
  }
  return "";
}

function parsePrice(priceField: unknown): number {
  const text = extractText(priceField);
  return parseInt(text.replace(/[₹,\s]/g, "")) || 0;
}

export async function searchBlinkit(query: string): Promise<BlinkitProduct[]> {
  const url = `https://blinkit.com/v1/layout/search?q=${encodeURIComponent(query)}&search_type=type_to_search`;

  const res = await fetch(url, { headers: BLINKIT_HEADERS });

  if (!res.ok) {
    throw new Error(`Blinkit API error: ${res.status} — headers may have expired. Re-run intercept-blinkit.ts`);
  }

  const json = await res.json();
  const snippets: unknown[] = json?.response?.snippets ?? [];

  const products: BlinkitProduct[] = [];

  for (const snippet of snippets) {
    const d = (snippet as { data?: Record<string, unknown> }).data;
    if (!d || !d.name || !d.normal_price) continue;

    const name = extractText(d.name);
    const brand = extractText(d.brand_name);
    const variant = extractText(d.variant);
    const price = parsePrice(d.normal_price);
    const mrpField = (d.offer as { mrp?: unknown } | undefined)?.mrp;
    const mrp = mrpField ? parsePrice(mrpField) : null;
    const isAvailable = !(d.is_sold_out as boolean);

    if (name && price > 0) {
      products.push({ name, brand, variant, price, mrp, isAvailable });
    }
  }

  return products;
}

// ── Run directly ────────────────────────────────────────────────────────────
const query = process.argv[2] || "red bull";
console.log(`🔍 Searching Blinkit for "${query}"...\n`);

searchBlinkit(query)
  .then((products) => {
    if (products.length === 0) {
      console.log("No products found. Headers may have expired — re-run intercept-blinkit.ts");
      return;
    }
    console.log(`✅ ${products.length} products found:\n`);
    products.forEach((p) => {
      const mrpStr = p.mrp && p.mrp > p.price ? `  (MRP ₹${p.mrp})` : "";
      const stock = p.isAvailable ? "" : "  ❌ Out of stock";
      console.log(`  • ${p.brand} ${p.name}  |  ${p.variant}  |  ₹${p.price}${mrpStr}${stock}`);
    });
  })
  .catch((err) => console.error("❌", err.message));
