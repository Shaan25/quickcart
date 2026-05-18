import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

chromium.use(StealthPlugin());

const SEARCH_QUERY = "red bull";

async function scrapeBlinkit() {
  console.log("🚀 Opening Blinkit...");

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  try {
    await page.goto("https://blinkit.com", { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("✅ Opened Blinkit");
    await page.waitForTimeout(2000);

    // ── Check location ─────────────────────────────────────────────────
    const locationText = await page.locator("[class*='HeaderContainer'] [class*='address'], [class*='delivery-location'], .tw-truncate").first().textContent().catch(() => "");
    console.log(`📍 Delivery location: ${locationText?.trim() || "not detected"}`);

    // ── Search using keyboard ──────────────────────────────────────────
    console.log(`🔍 Searching for "${SEARCH_QUERY}"...`);

    // Log all inputs to find the right one
    const inputInfo = await page.evaluate(() =>
      Array.from(document.querySelectorAll("input")).map((el, i) => ({
        i, placeholder: el.placeholder, type: el.type, visible: el.offsetParent !== null,
      }))
    );
    console.log("Inputs on page:", JSON.stringify(inputInfo));

    // Click the first visible input (should be the search bar)
    const inputs = page.locator("input");
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const visible = await inputs.nth(i).isVisible();
      if (visible) {
        await inputs.nth(i).click();
        console.log(`  Clicked input[${i}]`);
        break;
      }
    }
    await page.waitForTimeout(600);
    await page.keyboard.type(SEARCH_QUERY, { delay: 100 });
    await page.waitForTimeout(800);
    await page.keyboard.press("Enter");

    // ── Wait until real prices appear (not skeleton) ───────────────────
    console.log("⏳ Waiting for prices to load...");
    await page.waitForFunction(
      () => {
        const prices = document.querySelectorAll(".tw-text-200.tw-font-semibold");
        return [...prices].some((el) => el.textContent?.trim().startsWith("₹"));
      },
      { timeout: 20000 }
    );
    await page.waitForTimeout(1000); // let a few more products render
    console.log("✅ Products loaded");

    await page.screenshot({ path: "blinkit-debug.png" });

    // ── Extract ────────────────────────────────────────────────────────
    const products = await page.evaluate(() => {
      const results: { name: string; size: string; price: number; mrp: number | null }[] = [];
      const seen = new Set<Element>();

      for (const priceEl of document.querySelectorAll(".tw-text-200.tw-font-semibold")) {
        const priceText = priceEl.textContent?.trim() ?? "";
        if (!priceText.startsWith("₹")) continue;
        const price = parseInt(priceText.replace("₹", "").trim());
        if (!price || price > 5000) continue;

        // Walk up to the product card
        let card: Element | null = priceEl;
        for (let i = 0; i < 10; i++) {
          card = card?.parentElement ?? null;
          if (!card) break;
          if (card.textContent?.includes("mins") || card.textContent?.includes("MINS")) break;
        }
        if (!card || seen.has(card)) continue;
        seen.add(card);

        const mrpEl = card.querySelector(".tw-line-through");
        const mrp = mrpEl ? parseInt(mrpEl.textContent?.replace("₹", "").trim() ?? "0") || null : null;

        let raw = card.textContent?.replace(/\s+/g, " ").trim() ?? "";
        raw = raw
          .replace(/\d+%\s*OFF/gi, "")
          .replace(/\d+\s*MINS?/gi, "")
          .replace(/\d+\s*mins?/gi, "")
          .replace(priceText, "")
          .replace(mrpEl?.textContent?.trim() ?? "~~~~", "")
          .replace(/\b(ADD|BUY)\b/gi, "")
          .replace(/\d+ options?/gi, "")
          .replace(/\d+$/, "")
          .replace(/\s+/g, " ")
          .trim();

        const sizeMatch = raw.match(/(\d+\.?\d*\s*(?:x\s*\d+\s*)?(?:ml|g|kg|l|ltr|litre|pcs?|pack|count))/i);
        const size = sizeMatch?.[0]?.trim() ?? "";
        const name = raw.replace(size, "").replace(/\s+/g, " ").trim();

        if (name && price > 0) results.push({ name, size, price, mrp });
      }
      return results;
    });

    if (products.length === 0) {
      console.log("⚠️  No products found. See blinkit-debug.png");
    } else {
      console.log(`\n✅ Found ${products.length} products for "${SEARCH_QUERY}" in your area:\n`);
      products.forEach((p) => {
        const mrpStr = p.mrp && p.mrp > p.price ? `  (MRP ₹${p.mrp})` : "";
        console.log(`  • ${p.name}  |  ${p.size}  |  ₹${p.price}${mrpStr}`);
      });
    }

  } catch (err) {
    console.error("❌ Error:", (err as Error).message);
    await page.screenshot({ path: "blinkit-error.png" }).catch(() => {});
  }

  console.log("\nClosing in 5 seconds...");
  await page.waitForTimeout(5000);
  await browser.close();
}

scrapeBlinkit();
