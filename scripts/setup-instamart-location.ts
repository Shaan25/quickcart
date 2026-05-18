/**
 * Run this ONCE to set your Swiggy Instamart delivery location.
 * Run: npx tsx scripts/setup-instamart-location.ts
 */

import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as readline from "readline";

chromium.use(StealthPlugin());

const SESSION_FILE = ".instamart-session-state.json";

async function setup() {
  console.log("🌐 Opening Swiggy Instamart...");
  console.log("👉 Set your delivery location in the browser.");
  console.log("👉 Once you can see products, come back and press Enter.\n");

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto("https://www.swiggy.com/instamart", { waitUntil: "domcontentloaded" });

  await new Promise<void>((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("Press Enter once your location is set... ", () => {
      rl.close();
      resolve();
    });
  });

  await context.storageState({ path: SESSION_FILE });
  console.log(`\n✅ Instamart session saved to ${SESSION_FILE}`);
  await browser.close();
}

setup().catch(console.error);
