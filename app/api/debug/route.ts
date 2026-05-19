import { NextResponse } from "next/server";
import { chromium } from "playwright";

export const dynamic = "force-dynamic";

export async function GET() {
  const info: Record<string, unknown> = {};
  info.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "not set";

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
        "--disable-gpu", "--single-process", "--no-zygote",
        "--disable-blink-features=AutomationControlled",
      ],
    });
    info.launch = "OK";
  } catch (e) {
    info.launch = `FAILED: ${(e as Error).message}`;
    return NextResponse.json(info);
  }

  // Test each platform
  const platforms = [
    { name: "blinkit", url: "https://blinkit.com/s/?q=milk", apiPattern: "v1/layout/search" },
    { name: "bigbasket", url: "https://www.bigbasket.com/ps/?q=milk", apiPattern: "listing-svc/v2/products" },
    { name: "zepto", url: "https://www.zeptonow.com/search?query=milk", apiPattern: "user-search-service/api/v3/search" },
  ];

  for (const p of platforms) {
    const ctx = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await ctx.newPage();

    // Inject stealth
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      (window as unknown as Record<string, unknown>).chrome = { runtime: {} };
    });

    let apiHit = false;
    let gotoStatus = "";
    let finalUrl = "";

    page.on("response", (res) => {
      if (res.url().includes(p.apiPattern)) apiHit = true;
    });

    try {
      await page.goto(p.url, { waitUntil: "domcontentloaded", timeout: 15000 });
      gotoStatus = "OK";
      finalUrl = page.url();
      await page.waitForTimeout(3000);
    } catch (e) {
      gotoStatus = `ERROR: ${(e as Error).message.slice(0, 100)}`;
    }

    info[p.name] = { gotoStatus, finalUrl, apiHit };
    await ctx.close();
  }

  await browser.close();
  return NextResponse.json(info);
}
