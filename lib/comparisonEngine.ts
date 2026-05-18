import type { NormalizedProduct, ProductGroup, SortOption } from "./types";

export function discountPct(product: NormalizedProduct): number {
  if (!product.mrp || product.mrp <= product.price) return 0;
  return Math.round(((product.mrp - product.price) / product.mrp) * 100);
}

function maxDiscount(group: ProductGroup): number {
  return Math.max(0, ...group.variants.map(discountPct));
}

export function sortGroups(groups: ProductGroup[], sortBy: SortOption): ProductGroup[] {
  return [...groups].sort((a, b) => {
    if (sortBy === "lowest_price") {
      return (a.cheapest?.price ?? Infinity) - (b.cheapest?.price ?? Infinity);
    }
    if (sortBy === "best_value") {
      return (a.bestValue?.unitPrice ?? Infinity) - (b.bestValue?.unitPrice ?? Infinity);
    }
    if (sortBy === "most_discounted") {
      return maxDiscount(b) - maxDiscount(a);
    }
    return a.productName.localeCompare(b.productName);
  });
}

export function getPriceDelta(product: NormalizedProduct, group: ProductGroup): number | null {
  if (!group.cheapest || !product.availability) return null;
  if (product.id === group.cheapest.id) return 0;
  return product.price - group.cheapest.price;
}

export function formatPrice(price: number): string {
  return `₹${price.toFixed(0)}`;
}

export function formatUnitPrice(unitPrice: number, unitLabel: string): string {
  return `${unitLabel.replace("₹/", "")} @ ₹${unitPrice.toFixed(1)}`;
}

export function getPlatformSearchUrl(platform: string, brand: string, name: string): string {
  const q = encodeURIComponent(`${brand} ${name}`.trim());
  if (platform === "blinkit") return `https://blinkit.com/search?q=${q}`;
  if (platform === "zepto") return `https://www.zeptonow.com/search?query=${q}`;
  return `https://www.swiggy.com/instamart/search?query=${q}`;
}
