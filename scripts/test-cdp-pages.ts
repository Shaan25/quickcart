import { chromium } from "playwright";

const CDP_URL = "http://127.0.0.1:9222";

async function main() {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const contexts = browser.contexts();
  console.log(`Contexts: ${contexts.length}`);
  for (const ctx of contexts) {
    const pages = ctx.pages();
    console.log(`  Context has ${pages.length} pages:`);
    for (const p of pages) {
      console.log(`    URL: ${p.url()}`);
    }
  }
}
main().catch(console.error);
