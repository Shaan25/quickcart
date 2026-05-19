import { NextResponse } from "next/server";
import { getBrowser, stealthPage } from "../../../lib/browser";
import { bigbasketAdapter } from "../../../adapters/bigbasketAdapter";
import { zeptoAdapter } from "../../../adapters/zeptoAdapter";

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

  if (test === "bb-adapter") {
    const start = Date.now();
    try {
      const products = await bigbasketAdapter.search("milk");
      return NextResponse.json({ count: products.length, ms: Date.now() - start, first: products[0] ?? null });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message, ms: Date.now() - start });
    }
  }

  if (test === "zepto-adapter") {
    const start = Date.now();
    try {
      const products = await zeptoAdapter.search("milk");
      return NextResponse.json({ count: products.length, ms: Date.now() - start, first: products[0] ?? null });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message, ms: Date.now() - start });
    }
  }

  if (test === "adapter-sim") {
    const logs: string[] = [];
    const t = () => Date.now();
    const t0 = t();
    try {
      const browser = await getBrowser();
      logs.push(`[${t()-t0}ms] browser: ${browser.isConnected()}`);
      const ctx = await browser.newContext({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });
      logs.push(`[${t()-t0}ms] context created`);
      const page = await ctx.newPage();
      logs.push(`[${t()-t0}ms] page created`);
      await stealthPage(page);
      logs.push(`[${t()-t0}ms] stealth applied`);

      let capturedBody: string | null = null;
      page.on("response", async (res) => {
        if (res.url().includes("listing-svc/v2/products") && res.status() === 200 && !capturedBody) {
          logs.push(`[${t()-t0}ms] page.on captured: ${res.url().slice(0, 100)}`);
          capturedBody = await res.text().catch(() => null);
        }
      });
      logs.push(`[${t()-t0}ms] page.on listener set`);

      try {
        await page.goto("https://www.bigbasket.com/ps/?q=milk", { waitUntil: "domcontentloaded", timeout: 18000 });
        logs.push(`[${t()-t0}ms] goto complete, url: ${page.url()}`);
      } catch (e) {
        logs.push(`[${t()-t0}ms] goto FAILED: ${(e as Error).message.slice(0, 200)}`);
      }

      logs.push(`[${t()-t0}ms] starting waitForTimeout(12000)...`);
      await page.waitForTimeout(12000);
      logs.push(`[${t()-t0}ms] waitForTimeout done, capturedBody: ${capturedBody ? `${capturedBody.length} bytes` : "null"}`);

      if (capturedBody) {
        try {
          const json = JSON.parse(capturedBody) as Record<string, unknown>;
          const tabs = (json.tabs as Array<{ product_info?: { products?: unknown[] } }>) ?? [];
          const count = tabs[0]?.product_info?.products?.length ?? 0;
          logs.push(`[${t()-t0}ms] parsed OK, products: ${count}`);
        } catch (e) {
          logs.push(`[${t()-t0}ms] parse error: ${(e as Error).message}`);
        }
      }

      await ctx.close();
    } catch (e) {
      logs.push(`[${t()-t0}ms] OUTER ERROR: ${(e as Error).message.slice(0, 200)}`);
    }
    return NextResponse.json({ logs });
  }

  if (test === "bb-response") {
    try {
      const browser = await getBrowser();
      const ctx = await browser.newContext({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });
      const page = await ctx.newPage();
      await stealthPage(page);

      const responsePromise = page.waitForResponse(
        (res) => res.url().includes("listing-svc/v2/products") && res.status() === 200,
        { timeout: 20000 }
      ).catch(() => null);

      await page.goto("https://www.bigbasket.com/ps/?q=milk", { waitUntil: "domcontentloaded", timeout: 20000 });
      const response = await responsePromise;

      let parsedData: unknown = null;
      let parseError = "";
      if (response) {
        try {
          parsedData = await response.json();
        } catch (e) {
          parseError = (e as Error).message;
        }
      }

      await ctx.close();
      return NextResponse.json({
        gotResponse: !!response,
        responseUrl: response ? response.url().slice(0, 150) : null,
        parseError,
        // Show structure of first product only
        firstProduct: parsedData
          ? (() => {
              const d = parsedData as Record<string, unknown>;
              const tabs = (d.tabs as Array<{ product_info?: { products?: unknown[] } }>) ?? [];
              const products = tabs[0]?.product_info?.products ?? [];
              return products.length ? products[0] : { tabCount: tabs.length, noProducts: true };
            })()
          : null,
        productCount: parsedData
          ? (() => {
              const d = parsedData as Record<string, unknown>;
              const tabs = (d.tabs as Array<{ product_info?: { products?: unknown[] } }>) ?? [];
              return tabs[0]?.product_info?.products?.length ?? 0;
            })()
          : 0,
      });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message.slice(0, 200) });
    }
  }

  if (!urls[test]) return NextResponse.json({ error: "use ?test=launch|blinkit|bigbasket|zepto|bb-response" });

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
