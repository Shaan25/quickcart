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

  if (test === "blinkit" || test === "bigbasket" || test === "zepto") {
    const urls: Record<string, { goto: string; api: string }> = {
      blinkit:   { goto: "https://blinkit.com/s/?q=milk",              api: "v1/layout/search" },
      bigbasket: { goto: "https://www.bigbasket.com/ps/?q=milk",        api: "listing-svc/v2/products" },
      zepto:     { goto: "https://www.zeptonow.com/search?query=milk",  api: "user-search-service" },
    };
    const cfg = urls[test];
    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--single-process", "--no-zygote", "--disable-blink-features=AutomationControlled"],
      });
      const ctx = await browser.newContext({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" });
      const page = await ctx.newPage();
      await page.addInitScript(() => { Object.defineProperty(navigator, "webdriver", { get: () => false }); });

      let apiHit = false;
      page.on("response", (res) => { if (res.url().includes(cfg.api)) apiHit = true; });

      let gotoResult = "";
      let finalUrl = "";
      try {
        await page.goto(cfg.goto, { waitUntil: "domcontentloaded", timeout: 12000 });
        gotoResult = "ok";
        finalUrl = page.url();
        await page.waitForTimeout(5000);
      } catch (e) {
        gotoResult = (e as Error).message.slice(0, 120);
      }

      await browser.close();
      return NextResponse.json({ platform: test, gotoResult, finalUrl, apiHit });
    } catch (e) {
      if (browser) await browser.close().catch(() => {});
      return NextResponse.json({ platform: test, error: (e as Error).message.slice(0, 200) });
    }
  }

  return NextResponse.json({ error: "unknown test. use ?test=launch|blinkit|bigbasket|zepto" });
}
