import { NextResponse } from "next/server";
import { chromium } from "playwright";
import * as fs from "fs";
import * as child_process from "child_process";

export const dynamic = "force-dynamic";

export async function GET() {
  const info: Record<string, unknown> = {};

  // Check env
  info.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "not set";
  info.NODE_ENV = process.env.NODE_ENV;

  // Check if chromium binary exists
  try {
    const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/root/.cache/ms-playwright";
    const files = fs.readdirSync(browsersPath);
    info.browsersDir = files;
  } catch (e) {
    info.browsersDir = `ERROR: ${(e as Error).message}`;
  }

  // Try to find chromium executable
  try {
    const result = child_process.execSync("find /root/.cache/ms-playwright -name 'chrome' -o -name 'chromium' 2>/dev/null | head -5").toString();
    info.chromiumBinary = result.trim() || "not found";
  } catch (e) {
    info.chromiumBinary = `find error: ${(e as Error).message}`;
  }

  // Try to launch browser
  try {
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--single-process", "--no-zygote"],
    });
    info.browserLaunch = "SUCCESS";
    const page = await browser.newPage();
    await page.goto("https://example.com", { timeout: 10000 });
    info.pageGoto = "SUCCESS";
    await browser.close();
  } catch (e) {
    info.browserLaunch = `FAILED: ${(e as Error).message}`;
  }

  return NextResponse.json(info);
}
