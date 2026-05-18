/**
 * Refreshes the Instamart session state.
 * Opens a visible Chrome window, waits 30 seconds for Swiggy to load,
 * then saves the session automatically.
 *
 * Usage: npx ts-node scripts/refresh-instamart-session.ts
 */
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";
import * as path from "path";

// @ts-ignore
chromium.use(StealthPlugin());

const SESSION_FILE = path.join(process.cwd(), ".instamart-session-state.json");
const WAIT_SECONDS = 35;

async function main() {
  console.log("Opening Swiggy Instamart...");

  const browser = await (chromium as unknown as { launch: (opts: object) => Promise<import("playwright").Browser> }).launch({
    headless: false,
    args: ["--no-sandbox"],
  });

  const context = await (browser as import("playwright").Browser).newContext();
  const page = await context.newPage();

  await page.goto("https://www.swiggy.com/instamart", { timeout: 60000 });
  console.log(`Page loaded. Auto-saving session in ${WAIT_SECONDS} seconds...`);
  console.log("If a location prompt shows up, set your area before the timer ends.\n");

  for (let i = WAIT_SECONDS; i > 0; i--) {
    process.stdout.write(`\r  Saving in ${i}s...   `);
    await new Promise((r) => setTimeout(r, 1000));
  }
  process.stdout.write("\r");

  const state = await context.storageState();
  fs.writeFileSync(SESSION_FILE, JSON.stringify(state, null, 2));

  console.log(`\n✓ Session saved to ${SESSION_FILE}`);
  console.log(`  Cookies: ${state.cookies.length}`);
  console.log(`  WAF token present: ${state.cookies.some((c) => c.name === "aws-waf-token") ? "yes (stripped at runtime)" : "no"}`);

  await browser.close();
  console.log("\nDone! Restart your dev server for live Instamart data.");
}

main().catch((err) => { console.error(err); process.exit(1); });
