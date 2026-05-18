import { normalizeProduct } from "../lib/normalizer";
import { tokenize } from "../lib/fuzzySearch";
import type { RawProduct } from "../lib/types";

function shouldMerge(a: ReturnType<typeof normalizeProduct>, b: ReturnType<typeof normalizeProduct>): boolean {
  if (a.baseUnit !== b.baseUnit) return false;
  const sizeDiff = Math.abs(a.baseQuantity - b.baseQuantity);
  const avgSize = (a.baseQuantity + b.baseQuantity) / 2;
  if (sizeDiff / avgSize >= 0.15) return false;
  const tokA = tokenize(a.normalizedName);
  const tokB = tokenize(b.normalizedName);
  const overlap = tokA.filter(t => tokB.includes(t)).length;
  return overlap / Math.min(tokA.length, tokB.length) >= 0.6;
}

const def = { id: "x", price: 10, availability: true, category: "test", unit: "g", platform: "blinkit" as const };

const pairs: [Partial<RawProduct>, Partial<RawProduct>, string, boolean][] = [
  [{ brand:"Maggi", name:"2-Minute Noodles Masala", size:"70 g"}, { brand:"Maggi", name:"MAGGI 2-Minute Instant Noodles | Masala", size:"1 pack (70 g)"}, "Maggi noodles 70g", true],
  [{ brand:"Amul", name:"Taaza Toned Milk", size:"500 ml"}, { brand:"Amul", name:"Taaza Toned Milk", size:"1 pack (500 ml)"}, "Amul Taaza 500ml", true],
  [{ brand:"Lay's", name:"American Style Cream & Onion Chips", size:"52 g"}, { brand:"Lay's", name:"American Style Cream & Onion Crisps", size:"1 pack (52.9 g)"}, "Lays 52g", true],
  [{ brand:"Lay's", name:"Classic Salted Chips", size:"4 x 26 g"}, { brand:"Lay's", name:"Classic Salted Chips", size:"26 g"}, "Lays multipack vs single", true],
  [{ brand:"Red Bull", name:"Energy Drink", size:"250 ml"}, { brand:"Red Bull", name:"Energy Drink", size:"355 ml"}, "Red Bull diff sizes", false],
  [{ brand:"Nestle KitKat", name:"Chunky Wafer", size:"40 g"}, { brand:"Kit-Kat", name:"Nestle KitKat Chunky Wafer Chocolate", size:"1 pc (40 g)"}, "KitKat chunky 40g", true],
];

for (const [a, b, label, expected] of pairs) {
  const na = normalizeProduct({ ...def, ...a } as RawProduct);
  const nb = normalizeProduct({ ...def, ...b, platform: "zepto" as const } as RawProduct);
  const result = shouldMerge(na, nb);
  const ok = result === expected ? "✓" : "✗";
  console.log(`${ok} ${label}: qty ${na.baseQuantity}${na.baseUnit} vs ${nb.baseQuantity}${nb.baseUnit} → merge=${result} (want ${expected})`);
}
