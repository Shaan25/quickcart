/**
 * This script opens Blinkit in a real browser, intercepts the internal API
 * call it makes when searching, and prints the clean JSON response.
 *
 * Once we capture the API endpoint + headers, we can call it directly
 * from Node.js — no browser needed after this.
 *
 * Run: npx tsx scripts/intercept-blinkit.ts
 */

import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";

chromium.use(StealthPlugin());

const SEARCH_QUERY = "red bull";

async function interceptBlinkit() {
  console.log("🚀 Opening Blinkit with network interceptor...\n");

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const capturedRequests: { url: string; headers: Record<string, string>; response: unknown }[] = [];

  // ── Intercept ALL network requests ──────────────────────────────────
  page.on("request", (req) => {
    const url = req.url();
    // Log any request that looks like a search/product API call
    if (url.includes("search") || url.includes("product") || url.includes("listing")) {
      console.log(`📡 API call: ${url.slice(0, 100)}`);
    }
  });

  page.on("response", async (res) => {
    const url = res.url();
    const contentType = res.headers()["content-type"] ?? "";

    // Capture JSON responses from search-related endpoints
    if (
      contentType.includes("application/json") &&
      (url.includes("search") || url.includes("product") || url.includes("listing"))
    ) {
      try {
        const body = await res.json();
        const req = res.request();
        capturedRequests.push({
          url,
          headers: req.headers(),
          response: body,
        });
        console.log(`✅ Captured JSON from: ${url.slice(0, 100)}`);
        console.log(`   Keys in response: ${Object.keys(body).join(", ")}\n`);
      } catch {}
    }
  });

  try {
    await page.goto("https://blinkit.com", { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("Blinkit opened. Waiting for page to settle...");
    await page.waitForTimeout(3000);

    // ── Try every possible way to trigger a search ──────────────────
    console.log(`\nNow searching for "${SEARCH_QUERY}"...`);
    console.log("Watch the browser — type in the search bar if it doesn't happen automatically.\n");

    // Method 1: Press / key (common search shortcut)
    await page.keyboard.press("/");
    await page.waitForTimeout(500);

    // Method 2: Click anything that looks like a search area
    const searchSelectors = [
      '[placeholder*="Search"]',
      '[placeholder*="search"]',
      '[aria-label*="search"]',
      '[aria-label*="Search"]',
      '[class*="search"]',
      '[class*="Search"]',
      'input',
      '[contenteditable="true"]',
      '[role="searchbox"]',
      '[role="combobox"]',
    ];

    let clicked = false;
    for (const sel of searchSelectors) {
      try {
        const el = page.locator(sel).first();
        const visible = await el.isVisible({ timeout: 1000 });
        if (visible) {
          await el.click();
          console.log(`✅ Clicked: ${sel}`);
          clicked = true;
          break;
        }
      } catch {}
    }

    if (!clicked) {
      // Last resort: click at the coordinates where the search bar is
      console.log("⚠️  Clicking search bar by coordinates...");
      await page.mouse.click(640, 43);
    }

    await page.waitForTimeout(600);
    await page.keyboard.type(SEARCH_QUERY, { delay: 80 });
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");

    // Wait for API responses to come in
    console.log("\n⏳ Waiting for API responses...");
    await page.waitForTimeout(6000);

    // ── Save all captured data ───────────────────────────────────────
    if (capturedRequests.length === 0) {
      console.log("\n⚠️  No API calls captured yet.");
      console.log("   The search may not have fired, OR Blinkit uses a non-standard API format.");
      console.log("   Screenshot saved to blinkit-intercept.png");
      await page.screenshot({ path: "blinkit-intercept.png" });
    } else {
      console.log(`\n✅ Captured ${capturedRequests.length} API call(s)`);

      // Save full data to a file for inspection
      fs.writeFileSync("blinkit-api-data.json", JSON.stringify(capturedRequests, null, 2));
      console.log("💾 Full API data saved to: blinkit-api-data.json");

      // Print a summary of the first search result
      const searchResult = capturedRequests[0];
      console.log("\n📦 API endpoint found:");
      console.log(`   URL: ${searchResult.url}`);
      console.log("\n🔑 Headers needed:");
      const importantHeaders = ["lat", "lon", "auth_token", "app_client", "device_id", "rirective"];
      for (const h of importantHeaders) {
        if (searchResult.headers[h]) {
          console.log(`   ${h}: ${searchResult.headers[h]}`);
        }
      }
    }

  } catch (err) {
    console.error("❌ Error:", (err as Error).message);
    await page.screenshot({ path: "blinkit-intercept.png" }).catch(() => {});
  }

  console.log("\nClosing in 8 seconds...");
  await page.waitForTimeout(8000);
  await browser.close();
}

interceptBlinkit();
