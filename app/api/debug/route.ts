import { NextResponse } from "next/server";
import { getBrowser, stealthPage } from "../../../lib/browser";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const test = searchParams.get("test") ?? "launch";

  if (test === "launch") {
    try {
      const browser = await getBrowser();
      return NextResponse.json({ status: "browser_ok", connected: browser.isConnected() });
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

  try {
    const browser = await getBrowser();
    const ctx = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await ctx.newPage();
    await stealthPage(page);

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
      await page.goto(urls[test], { waitUntil: "domcontentloaded", timeout: 20000 });
      gotoResult = "ok";
      finalUrl = page.url();
      await page.waitForTimeout(8000);
    } catch (e) {
      gotoResult = (e as Error).message.slice(0, 120);
      finalUrl = page.url();
    }

    await ctx.close();
    return NextResponse.json({ platform: test, gotoResult, finalUrl, apiCalls });
  } catch (e) {
    return NextResponse.json({ platform: test, error: (e as Error).message.slice(0, 200) });
  }
}
