/**
 * Run this ONCE to set your Blinkit delivery location.
 * It opens a browser, you set your location manually,
 * then press Enter in the terminal to save the session.
 * All future searches will reuse this saved session.
 *
 * Run: npx tsx scripts/setup-location.ts
 */

import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";
import * as readline from "readline";

chromium.use(StealthPlugin());

const SESSION_FILE = ".blinkit-session-state.json";

async function setupLocation() {
  console.log("🌐 Opening Blinkit...");
  console.log("👉 Set your delivery location in the browser window.");
  console.log("👉 Once location is set and you can see products, come back here and press Enter.\n");

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto("https://blinkit.com", { waitUntil: "domcontentloaded" });

  // Wait for user to set location manually
  await new Promise<void>((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("Press Enter once your location is set in the browser... ", () => {
      rl.close();
      resolve();
    });
  });

  // Save the full browser session (cookies + localStorage)
  await context.storageState({ path: SESSION_FILE });
  console.log(`\n✅ Session saved to ${SESSION_FILE}`);
  console.log("You can now run searches — location will be remembered.\n");

  await browser.close();
}

setupLocation().catch(console.error);
