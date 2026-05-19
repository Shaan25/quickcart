# QuickCart — Codex Brief

## Project
Next.js 15 grocery price comparison app deployed on Render (Singapore, free tier: 512MB RAM, 0.1 CPU).
Scrapes Blinkit, BigBasket, and Zepto using Playwright headless Chrome.
Live at: https://quickcart-pu9u.onrender.com

## Stack
- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS
- playwright + playwright-extra (stealth plugin) for browser automation
- Render.com free tier hosting

## Current Status

### Working
- **Zepto** — fully working, returns real prices via `bff-gateway.zepto.com/user-search-service/api/v3/search`
- Location gate, animated loader, image proxy, no mock fallback

### Broken
- **BigBasket** — stealth plugin makes the listing-svc API fire (confirmed via debug endpoint), BUT parallel execution causes OOM on 512MB RAM. Fix in progress: browser launch mutex in `lib/browser.ts`.
- **Blinkit** — Cloudflare Bot Management blocks all API calls from Render's datacenter IP. `apiCalls: []` even with full stealth. Needs residential Indian proxy to bypass.

## Key Files

```
lib/browser.ts          — Playwright browser singleton with playwright-extra stealth + launch mutex
lib/proxy.ts            — Optional PROXY_URL / SCRAPER_API_KEY support (not currently used)
adapters/blinkitAdapter.ts    — Playwright scraper for Blinkit
adapters/bigbasketAdapter.ts  — Playwright scraper for BigBasket  
adapters/zeptoAdapter.ts      — Playwright scraper for Zepto
app/api/search/route.ts       — Runs all 3 adapters in parallel, 18s timeout each
app/api/debug/route.ts        — Debug endpoint: ?test=launch|blinkit|bigbasket|zepto|bb-response
app/api/img/route.ts          — Image proxy to bypass CDN hotlink protection
```

## Debug Endpoint Results (from Render)

```
/api/debug?test=zepto      → apiCalls includes bff-gateway.zepto.com search API ✅
/api/debug?test=bigbasket  → apiCalls includes listing-svc/v2/products ✅ (works in isolation)
/api/debug?test=blinkit    → apiCalls: [] ❌ (Cloudflare blocks everything)
/api/debug?test=bb-response → gotResponse: true, productCount: 41 ✅ (data structure confirmed correct)
```

## What Needs to Be Done

### Task 1 — Get BigBasket working in parallel (HIGH PRIORITY)
The browser launch mutex in `lib/browser.ts` should prevent multiple Chromium instances.
After deploy, test: `GET /api/search?q=milk&lat=12.9716&lng=77.5946`
Expected: both `zepto` and `bigbasket` products in response.
If still broken, check if `page.waitForResponse()` in the adapter catches the response correctly.

### Task 2 — Fix Blinkit (HARD)
Blinkit uses Cloudflare Bot Management that blocks Render's Singapore datacenter IP.
Options tried: playwright-extra stealth plugin, manual webdriver/chrome patches — all blocked.
Options NOT tried:
- `rebrowser-patches` npm package (patches Playwright CDP to remove Runtime.enable detection)
- Different browser engine (firefox via playwright)
- Direct API call approach: intercept Blinkit's auth_key from initial page load, then call the API directly with fetch (no browser needed for subsequent calls)

### Task 3 — Performance (MEDIUM)
Search takes 18-30s which is too long. Approaches to investigate:
- Cache results in-memory (TTL 60s) so repeat searches are instant
- Reuse browser pages between searches instead of creating new ones each time
- Pre-warm browser on server startup

### Task 4 — Render Auto-Deploy Broken (LOW)
GitHub webhook to Render stopped triggering. Each deploy requires manual API call:
```bash
curl -X POST "https://api.render.com/v1/services/srv-d85gveek1jcs73flqqv0/deploys" \
  -H "Authorization: Bearer rnd_EauuM4BMDzzMZQm5sQsAYVNThRLZ" \
  -H "Content-Type: application/json" \
  -d '{"clearCache":"do_not_clear"}'
```
Fix: re-connect GitHub integration in Render dashboard.

## Environment Variables on Render
```
SCRAPER_API_KEY = 512e1abec3dae65433fc4bec93cc1be5  (ScraperAPI, free tier — not currently used)
```

## BigBasket Response Structure (confirmed working)
```json
{
  "tabs": [{
    "product_info": {
      "products": [{
        "desc": "Pasteurised Toned Milk",
        "brand": { "name": "Nandini" },
        "w": "500 ml",
        "pricing": {
          "discount": {
            "mrp": "24",
            "prim_price": { "sp": "24" }
          }
        },
        "availability": { "avail_status": "001", "button": "Add" },
        "images": [{ "m": "https://www.bbassets.com/...", "s": "..." }]
      }]
    }
  }]
}
```
Note: `mrp` and `sp` are strings, not numbers. The adapter uses `Number(...)` which handles this correctly.
