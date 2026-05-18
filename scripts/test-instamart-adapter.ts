import { instamartAdapter } from '../adapters/instamartAdapter';

async function main() {
  console.log('Testing Instamart adapter via real Chrome...');
  const results = await instamartAdapter.search('red bull');
  console.log('Results:', results.length);
  results.forEach(p => console.log(' -', p.brand, '|', p.name, '|', p.size, '| ₹'+p.price));
}

main().catch(console.error);
