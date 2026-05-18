import type { BaseUnit, RawProduct, NormalizedProduct } from "./types";

const UNIT_ALIASES: Record<string, { unit: BaseUnit; multiplier: number }> = {
  kg: { unit: "g", multiplier: 1000 },
  kgs: { unit: "g", multiplier: 1000 },
  kilogram: { unit: "g", multiplier: 1000 },
  gm: { unit: "g", multiplier: 1 },
  gms: { unit: "g", multiplier: 1 },
  gram: { unit: "g", multiplier: 1 },
  grams: { unit: "g", multiplier: 1 },
  g: { unit: "g", multiplier: 1 },
  l: { unit: "ml", multiplier: 1000 },
  ltr: { unit: "ml", multiplier: 1000 },
  litre: { unit: "ml", multiplier: 1000 },
  litres: { unit: "ml", multiplier: 1000 },
  liter: { unit: "ml", multiplier: 1000 },
  liters: { unit: "ml", multiplier: 1000 },
  ml: { unit: "ml", multiplier: 1 },
  pcs: { unit: "piece", multiplier: 1 },
  pc: { unit: "piece", multiplier: 1 },
  piece: { unit: "piece", multiplier: 1 },
  pieces: { unit: "piece", multiplier: 1 },
  nos: { unit: "piece", multiplier: 1 },
  count: { unit: "piece", multiplier: 1 },
  pack: { unit: "piece", multiplier: 1 },
};

export function parseQuantity(sizeStr: string): { value: number; unit: BaseUnit } {
  const cleaned = sizeStr.toLowerCase().trim();

  // Multi-pack "N x Xunit" or "N × Xunit": "4 x 250 ml", "2 × 32g"
  // Use the UNIT quantity (not total) so a 4-pack of 250ml matches a single 250ml listing
  const multiPack = cleaned.match(/\d+\s*[x×]\s*(\d+(?:\.\d+)?)\s*([a-z]+)/);
  if (multiPack) {
    const alias = UNIT_ALIASES[multiPack[2]];
    if (alias) return { value: parseFloat(multiPack[1]) * alias.multiplier, unit: alias.unit };
  }

  // Extract weight/volume from inside parentheses: "1 pc (150 g)" → 150g
  const parenMatch = cleaned.match(/\((\d+(?:\.\d+)?)\s*([a-z]+)\)/);
  if (parenMatch) {
    const alias = UNIT_ALIASES[parenMatch[2]];
    if (alias) return { value: parseFloat(parenMatch[1]) * alias.multiplier, unit: alias.unit };
  }

  // Simple format: "150g", "250 ml", "1kg"
  const simple = cleaned.match(/^([\d.]+)\s*([a-z]+)$/);
  if (simple) {
    const alias = UNIT_ALIASES[simple[2]];
    if (alias) return { value: parseFloat(simple[1]) * alias.multiplier, unit: alias.unit };
  }

  return { value: 1, unit: "piece" };
}

export function computeUnitPrice(price: number, quantity: number, unit: BaseUnit): { unitPrice: number; unitLabel: string } {
  if (unit === "piece") {
    return { unitPrice: price / quantity, unitLabel: "₹/piece" };
  }
  const per100 = (price / quantity) * 100;
  return {
    unitPrice: Math.round(per100 * 100) / 100,
    unitLabel: unit === "ml" ? "₹/100ml" : "₹/100g",
  };
}

export function normalizeSearchQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeProductName(name: string, brand: string): string {
  const combined = `${brand} ${name}`.toLowerCase();
  return combined
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildMatchKey(brand: string, name: string, size: string): string {
  const normalizedBrand = brand.toLowerCase().replace(/[^a-z0-9]/g, "");
  const coreWords = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => !["the", "a", "an", "of", "with", "and"].includes(w))
    .slice(0, 3)
    .join("_");
  const { value, unit } = parseQuantity(size);
  return `${normalizedBrand}_${coreWords}_${value}${unit}`;
}

export function normalizeProduct(raw: RawProduct): NormalizedProduct {
  const { value, unit } = parseQuantity(raw.size);
  const { unitPrice, unitLabel } = computeUnitPrice(raw.price, value, unit);
  return {
    ...raw,
    normalizedName: normalizeProductName(raw.name, raw.brand),
    baseQuantity: value,
    baseUnit: unit,
    unitPrice,
    unitLabel,
    matchKey: buildMatchKey(raw.brand, raw.name, raw.size),
  };
}
