import { NextResponse } from "next/server";
import { chromium } from "playwright";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const test = searchParams.get("test") ?? "launch";

  if (test === "launch") {
    try {
      const browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--single-process", "--no-zygote", "--disable-blink-features=AutomationControlled"],
      });
      await browser.close();
      return NextResponse.json({ status: "browser_ok" });
    } catch (e) {
      return NextResponse.json({ status: "browser_failed", error: (e as Error).message });
    }
  }

  const urls: Record<string, string> = {
    blinkit:   "https://blinkit.com/s/?q=milk",
    bigbasket: "https://www.bigbasket.com/ps/?q=milk",
    zepto:     "https://www.zepto.com/search?query=milk",
  };

  if (!urls[test]) return NextResponse.json({ error: "use ?test=launch|blinkit|bigbasket|zepto" });

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--single-process", "--no-zygote", "--disable-blink-features=AutomationControlled"],
    });
    const ctx = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      (window as unknown as Record<string, unknown>).chrome = { runtime: {}, loadTimes: () => ({}), csi: () => ({}) };
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
      Object.defineProperty(navigator, "languages", { get: () => ["en-IN", "en"] });
    });

    // Capture ALL XHR/fetch calls
    const apiCalls: string[] = [];
    page.on("response", (res) => {
      const url = res.url();
      const ct = res.headers()["content-type"] ?? "";
      if (ct.includes("json") || url.includes("/api/") || url.includes("-svc/") || url.includes("search") || url.includes("product")) {
        apiCalls.push(`[${res.status()}] ${url.slice(0, 120)}`);
      }
    });

    let gotoResult = "";
    let finalUrl = "";
    try {
      await page.goto(urls[test], { waitUntil: "domcontentloaded", timeout: 15000 });
      gotoResult = "ok";
      finalUrl = page.url();
      await page.waitForTimeout(8000);
    } catch (e) {
      gotoResult = (e as Error).message.slice(0, 120);
      finalUrl = page.url();
    }

    await browser.close();
    return NextResponse.json({ platform: test, gotoResult, finalUrl, apiCalls });
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    return NextResponse.json({ platform: test, error: (e as Error).message.slice(0, 200) });
  }
}
