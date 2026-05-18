import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";

chromium.use(StealthPlugin());

const SESSION_FILE = ".instamart-session-state.json";

async function tryApproach(label: string, fn: () => Promise<string>) {
  try {
    const result = await fn();
    console.log(`✅ ${label}: ${result}`);
    return true;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`❌ ${label}: ${msg.slice(0, 120)}`);
    return false;
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-web-security",
      "--lang=en-IN",
    ],
  });

  const context = await browser.newContext({
    storageState: SESSION_FILE,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: {
      "Accept-Language": "en-IN,en;q=0.9",
    },
  });

  const page = await context.newPage();
  
  // Approach 1: Direct search URL
  await tryApproach("Direct instamart search", async () => {
    const resp = await page.goto("https://www.swiggy.com/instamart/search?query=red+bull", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    return `status ${resp?.status()} url=${page.url().slice(0, 80)}`;
  });

  await page.waitForTimeout(3000);
  
  // Capture any API calls
  const captured: string[] = [];
  page.on("response", (res) => {
    if (res.url().includes("swiggy.com") && res.url().includes("instamart")) {
      captured.push(`${res.status()} ${res.url().slice(0, 100)}`);
    }
  });

  // Approach 2: Homepage first then instamart
  await tryApproach("Homepage → Instamart", async () => {
    const resp = await page.goto("https://www.swiggy.com", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    return `swiggy.com status ${resp?.status()}`;
  });

  await page.waitForTimeout(2000);

  await tryApproach("Navigate to Instamart", async () => {
    const resp = await page.goto("https://www.swiggy.com/instamart", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    return `status ${resp?.status()}`;
  });

  await page.waitForTimeout(3000);
  await page.screenshot({ path: "instamart-test.png" });
  console.log("\n📸 Screenshot saved: instamart-test.png");
  console.log("\nCaptured API calls:", captured.length);
  captured.forEach(c => console.log(" ", c));

  await browser.close();
}

main().catch(console.error);
