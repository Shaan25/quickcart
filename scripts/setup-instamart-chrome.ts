/**
 * One-time setup: Opens YOUR real Chrome browser with remote debugging enabled.
 * Swiggy's bot detection can't fingerprint real Chrome.
 * Run: npx tsx scripts/setup-instamart-chrome.ts
 */
import { chromium } from "playwright";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

const SESSION_FILE = path.join(process.cwd(), ".instamart-chrome-session.json");
const CDP_URL = "http://127.0.0.1:9222";

async function main() {
  console.log("🌐 This uses YOUR real Chrome to bypass Swiggy's bot detection.\n");
  console.log("Step 1: Open Chrome with remote debugging by running this command:\n");
  console.log("  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --no-first-run\n");
  console.log("Step 2: In Chrome, navigate to https://www.swiggy.com/instamart");
  console.log("        Set your delivery location.");
  console.log("        Once you can see products on the home page, press Enter here.\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>((resolve) => {
    rl.question("Press Enter once location is set... ", () => { rl.close(); resolve(); });
  });

  try {
    const browser = await chromium.connectOverCDP(CDP_URL);
    const contexts = browser.contexts();
    const context = contexts[0];
    if (!context) throw new Error("No browser context found");

    await context.storageState({ path: SESSION_FILE });
    console.log(`\n✅ Instamart Chrome session saved to ${SESSION_FILE}`);
    await browser.close();
  } catch (e) {
    console.error("❌ Could not connect to Chrome. Make sure you started Chrome with --remote-debugging-port=9222");
    console.error(e);
  }
}

main().catch(console.error);
