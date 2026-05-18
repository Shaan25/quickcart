import { chromium } from "playwright";
const CDP_URL = "http://127.0.0.1:9222";
async function main() {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find(p => p.url().includes("swiggy.com/instamart"))!;
  
  // Grab any interactive/focusable elements
  const elements = await page.$$eval("[data-testid], [role='searchbox'], [role='combobox'], [contenteditable]", (els) =>
    els.map((el) => ({
      tag: el.tagName,
      role: el.getAttribute("role"),
      testid: el.getAttribute("data-testid"),
      contenteditable: el.getAttribute("contenteditable"),
      text: el.textContent?.slice(0, 40),
    }))
  );
  console.log("Interactive elements:", JSON.stringify(elements, null, 2));
}
main().catch(console.error);
