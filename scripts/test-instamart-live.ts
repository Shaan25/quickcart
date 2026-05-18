/**
 * Test live Instamart search via real Chrome CDP.
 * Prerequisite: Chrome running with --remote-debugging-port=9222
 * Run: npx tsx scripts/test-instamart-live.ts
 */
import { instamartAdapter } from "../adapters/instamartAdapter";

async function main() {
  const query = process.argv[2] ?? "red bull";
  console.log(`[Test] Searching Instamart for: "${query}"`);
  const results = await instamartAdapter.search(query);
  console.log(`\nTotal results: ${results.length}`);
  results.slice(0, 5).forEach((p) => {
    console.log(`  ${p.brand} ${p.name} ${p.size} — ₹${p.price}`);
  });
}

main().catch(console.error);
