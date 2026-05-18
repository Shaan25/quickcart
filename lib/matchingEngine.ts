import type { NormalizedProduct, ProductGroup } from "./types";
import { scoreMatch, tokenize } from "./fuzzySearch";
import { normalizeSearchQuery } from "./normalizer";

const SCORE_THRESHOLD = 0.45;

export function searchProducts(
  products: NormalizedProduct[],
  query: string
): NormalizedProduct[] {
  const normalizedQuery = normalizeSearchQuery(query);

  return products
    .map((p) => ({
      product: p,
      score: scoreMatch(normalizedQuery, p.normalizedName),
    }))
    .filter(({ score }) => score >= SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product);
}

export function groupProducts(products: NormalizedProduct[]): ProductGroup[] {
  // Group by matchKey first (exact platform-normalized key)
  const keyGroups = new Map<string, NormalizedProduct[]>();

  for (const product of products) {
    const existing = keyGroups.get(product.matchKey) ?? [];
    existing.push(product);
    keyGroups.set(product.matchKey, existing);
  }

  // Merge similar groups (same brand + name, within ~20% size difference)
  const merged = mergeSimilarGroups(keyGroups);

  return merged.map((group, idx) => buildProductGroup(group, idx));
}

function mergeSimilarGroups(
  keyGroups: Map<string, NormalizedProduct[]>
): NormalizedProduct[][] {
  const groups: NormalizedProduct[][] = Array.from(keyGroups.values());
  const merged: boolean[] = new Array(groups.length).fill(false);
  const result: NormalizedProduct[][] = [];

  for (let i = 0; i < groups.length; i++) {
    if (merged[i]) continue;
    const current = [...groups[i]];
    for (let j = i + 1; j < groups.length; j++) {
      if (merged[j]) continue;
      if (shouldMerge(groups[i], groups[j])) {
        current.push(...groups[j]);
        merged[j] = true;
      }
    }
    result.push(current);
  }
  return result;
}

function shouldMerge(a: NormalizedProduct[], b: NormalizedProduct[]): boolean {
  const repA = a[0], repB = b[0];

  // Size must be compatible
  if (repA.baseUnit !== repB.baseUnit) return false;
  const sizeDiff = Math.abs(repA.baseQuantity - repB.baseQuantity);
  const avgSize = (repA.baseQuantity + repB.baseQuantity) / 2;
  if (sizeDiff / avgSize >= 0.15) return false;

  // Use normalizedName (brand + name combined) for token overlap — handles brand
  // variations like "Nestle KitKat" vs "Kit-Kat" being the same product
  const tokensA = tokenize(repA.normalizedName);
  const tokensB = tokenize(repB.normalizedName);
  const overlap = tokensA.filter((t) => tokensB.includes(t)).length;
  const minLen = Math.min(tokensA.length, tokensB.length);
  return overlap / minLen >= 0.6;
}

function buildProductGroup(products: NormalizedProduct[], idx: number): ProductGroup {
  const available = products.filter((p) => p.availability);
  const rep = products[0];

  let cheapest: NormalizedProduct | null = null;
  let bestValue: NormalizedProduct | null = null;

  for (const p of available) {
    if (!cheapest || p.price < cheapest.price) cheapest = p;
    if (!bestValue || p.unitPrice < bestValue.unitPrice) bestValue = p;
  }

  // deduplicate: one product per platform (cheapest per platform)
  const platformMap = new Map<string, NormalizedProduct>();
  for (const p of products) {
    const existing = platformMap.get(p.platform);
    if (!existing || p.price < existing.price) {
      platformMap.set(p.platform, p);
    }
  }

  return {
    groupId: `group_${idx}`,
    productName: `${rep.brand} ${rep.name}`,
    category: rep.category,
    variants: Array.from(platformMap.values()),
    cheapest,
    bestValue,
    platformCount: platformMap.size,
  };
}
