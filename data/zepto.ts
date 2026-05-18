import type { RawProduct } from "../lib/types";

export const zeptoProducts: RawProduct[] = [
  // Red Bull
  { id: "zp_001", name: "Energy Drink", brand: "Red Bull", size: "250ml", unit: "ml", price: 130, mrp: 130, availability: true, category: "beverages", platform: "zepto" },
  { id: "zp_002", name: "Energy Drink Sugar Free", brand: "Red Bull", size: "250ml", unit: "ml", price: 138, mrp: 140, availability: false, category: "beverages", platform: "zepto" },
  { id: "zp_003", name: "Energy Drink", brand: "Red Bull", size: "355ml", unit: "ml", price: 180, mrp: 185, availability: true, category: "beverages", platform: "zepto" },
  // Amul Milk
  { id: "zp_004", name: "Full Cream Milk", brand: "Amul", size: "500ml", unit: "ml", price: 33, mrp: 34, availability: true, category: "dairy", platform: "zepto" },
  { id: "zp_005", name: "Full Cream Milk", brand: "Amul", size: "1L", unit: "L", price: 65, mrp: 66, availability: true, category: "dairy", platform: "zepto" },
  { id: "zp_006", name: "Taaza Toned Milk", brand: "Amul", size: "500ml", unit: "ml", price: 27, mrp: 28, availability: true, category: "dairy", platform: "zepto" },
  { id: "zp_007", name: "Taaza Toned Milk", brand: "Amul", size: "1L", unit: "L", price: 53, mrp: 54, availability: true, category: "dairy", platform: "zepto" },
  // Eggs
  { id: "zp_008", name: "Farm Fresh Eggs", brand: "Country Delight", size: "6 pcs", unit: "pcs", price: 48, mrp: 50, availability: true, category: "eggs", platform: "zepto" },
  { id: "zp_009", name: "Farm Fresh Eggs", brand: "Country Delight", size: "12 pcs", unit: "pcs", price: 92, mrp: 96, availability: false, category: "eggs", platform: "zepto" },
  // Maggi
  { id: "zp_010", name: "2-Minute Noodles Masala", brand: "Maggi", size: "70g", unit: "g", price: 15, mrp: 16, availability: true, category: "instant_food", platform: "zepto" },
  { id: "zp_011", name: "2-Minute Noodles Masala", brand: "Maggi", size: "280g", unit: "g", price: 56, mrp: 64, availability: true, category: "instant_food", platform: "zepto" },
  // Lays
  { id: "zp_012", name: "Classic Salted Chips", brand: "Lay's", size: "26g", unit: "g", price: 20, mrp: 20, availability: true, category: "snacks", platform: "zepto" },
  { id: "zp_013", name: "Classic Salted Chips", brand: "Lay's", size: "52g", unit: "g", price: 32, mrp: 30, availability: true, category: "snacks", platform: "zepto" },
  // Coca-Cola
  { id: "zp_014", name: "Cola", brand: "Coca-Cola", size: "250ml", unit: "ml", price: 32, mrp: 30, availability: true, category: "beverages", platform: "zepto" },
  { id: "zp_015", name: "Cola", brand: "Coca-Cola", size: "750ml", unit: "ml", price: 45, mrp: 47, availability: true, category: "beverages", platform: "zepto" },
  // Bread
  { id: "zp_016", name: "Milk Bread", brand: "Britannia", size: "400g", unit: "g", price: 44, mrp: 50, availability: true, category: "bakery", platform: "zepto" },
  // Amul Butter
  { id: "zp_017", name: "Pasteurised Butter", brand: "Amul", size: "100g", unit: "g", price: 55, mrp: 56, availability: true, category: "dairy", platform: "zepto" },
  { id: "zp_018", name: "Pasteurised Butter", brand: "Amul", size: "500g", unit: "g", price: 262, mrp: 268, availability: false, category: "dairy", platform: "zepto" },
  // Sprite
  { id: "zp_019", name: "Lemon Lime Drink", brand: "Sprite", size: "750ml", unit: "ml", price: 42, mrp: 47, availability: true, category: "beverages", platform: "zepto" },
  // Parle-G
  { id: "zp_020", name: "Glucose Biscuits", brand: "Parle-G", size: "100g", unit: "g", price: 10, mrp: 10, availability: false, category: "biscuits", platform: "zepto" },
  // KitKat
  { id: "zp_021", name: "Chocolate Wafer Bar", brand: "KitKat", size: "13.2g", unit: "g", price: 15, mrp: 15, availability: true, category: "chocolates", platform: "zepto" },
  // Tropicana
  { id: "zp_022", name: "Orange 100% Juice", brand: "Tropicana", size: "1L", unit: "L", price: 142, mrp: 155, availability: true, category: "juices", platform: "zepto" },
  // Haldirams
  { id: "zp_023", name: "Aloo Bhujia", brand: "Haldiram's", size: "200g", unit: "g", price: 70, mrp: 75, availability: true, category: "snacks", platform: "zepto" },
  // Surf Excel
  { id: "zp_024", name: "Quick Wash Detergent", brand: "Surf Excel", size: "500g", unit: "g", price: 108, mrp: 119, availability: true, category: "household", platform: "zepto" },
  // Dettol
  { id: "zp_025", name: "Original Soap", brand: "Dettol", size: "75g", unit: "g", price: 50, mrp: 52, availability: true, category: "personal_care", platform: "zepto" },
  // Monster
  { id: "zp_026", name: "Energy Drink Original", brand: "Monster", size: "500ml", unit: "ml", price: 110, mrp: 120, availability: true, category: "beverages", platform: "zepto" },
  // Sting
  { id: "zp_027", name: "Berry Blast Energy Drink", brand: "Sting", size: "250ml", unit: "ml", price: 28, mrp: 30, availability: true, category: "beverages", platform: "zepto" },
  // Vim
  { id: "zp_028", name: "Dishwash Bar", brand: "Vim", size: "200g", unit: "g", price: 29, mrp: 32, availability: true, category: "household", platform: "zepto" },
  // Munch
  { id: "zp_029", name: "Chocolate Bar", brand: "Nestle Munch", size: "50g", unit: "g", price: 27, mrp: 30, availability: true, category: "chocolates", platform: "zepto" },
  // Dairy Milk
  { id: "zp_030", name: "Silk Chocolate", brand: "Cadbury", size: "65g", unit: "g", price: 93, mrp: 99, availability: true, category: "chocolates", platform: "zepto" },
];
