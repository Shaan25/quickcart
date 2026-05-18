export type Platform = "blinkit" | "instamart" | "zepto";
export type BaseUnit = "g" | "ml" | "piece";
export type SortOption = "lowest_price" | "best_value" | "most_discounted" | "platform";

export interface RawProduct {
  id: string;
  name: string;
  brand: string;
  size: string;      // e.g. "250ml", "1kg", "6 pcs"
  unit: string;      // raw unit string
  price: number;     // in INR
  mrp?: number;
  availability: boolean;
  imageUrl?: string;
  category: string;
  platform: Platform;
}

export interface NormalizedProduct extends RawProduct {
  normalizedName: string;
  baseQuantity: number;   // in base unit (grams, ml, or pieces)
  baseUnit: BaseUnit;
  unitPrice: number;      // price per 100g / 100ml / per piece
  unitLabel: string;      // "₹/100ml", "₹/100g", "₹/piece"
  matchKey: string;       // for grouping across platforms
}

export interface ProductGroup {
  groupId: string;
  productName: string;
  category: string;
  variants: NormalizedProduct[];
  cheapest: NormalizedProduct | null;
  bestValue: NormalizedProduct | null;
  platformCount: number;
}

export interface SearchResponse {
  query: string;
  groups: ProductGroup[];
  totalProducts: number;
  searchTime: number;
}

export interface LocationCoords {
  lat: number;
  lng: number;
  label?: string;
  city?: string;
}

export interface PlatformAdapter {
  platform: Platform;
  search(query: string, location?: LocationCoords): Promise<RawProduct[]>;
  getById(id: string): Promise<RawProduct | null>;
}
