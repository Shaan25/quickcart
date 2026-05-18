import { chromium } from "playwright";

const CDP_URL = "http://127.0.0.1:9222";

async function main() {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find(p => p.url().includes("swiggy.com/instamart"))!;
  
  // Get all inputs on page
  const inputs = await page.$$eval("input", (els) =>
    els.map((el) => ({
      type: el.type,
      placeholder: el.placeholder,
      name: el.name,
      id: el.id,
      className: el.className.slice(0, 60),
      visible: el.offsetWidth > 0 && el.offsetHeight > 0,
    }))
  );
  console.log("Inputs on page:", JSON.stringify(inputs, null, 2));
  
  // Check search API when we type something
  console.log("\nCurrent URL:", page.url());
}
main().catch(console.error);
