import { zeptoAdapter } from '../adapters/zeptoAdapter';

async function main() {
  console.log('Testing Zepto adapter...');
  const results = await zeptoAdapter.search('red bull');
  console.log('Results:', results.length);
  results.forEach(p => console.log(' -', p.brand, '|', p.name, '|', p.size, '| ₹'+p.price));
}

main().catch(console.error);
