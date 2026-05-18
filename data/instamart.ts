import type { RawProduct } from "../lib/types";

export const instamartProducts: RawProduct[] = [
  // Red Bull
  { id: "im_001", name: "Energy Drink", brand: "Red Bull", size: "250ml", unit: "ml", price: 120, mrp: 130, availability: true, category: "beverages", platform: "instamart" },
  { id: "im_002", name: "Energy Drink Sugar Free", brand: "Red Bull", size: "250ml", unit: "ml", price: 130, mrp: 140, availability: true, category: "beverages", platform: "instamart" },
  { id: "im_003", name: "Energy Drink", brand: "Red Bull", size: "355ml", unit: "ml", price: 168, mrp: 185, availability: true, category: "beverages", platform: "instamart" },
  // Amul Milk
  { id: "im_004", name: "Full Cream Milk", brand: "Amul", size: "500ml", unit: "ml", price: 34, mrp: 34, availability: true, category: "dairy", platform: "instamart" },
  { id: "im_005", name: "Full Cream Milk", brand: "Amul", size: "1L", unit: "L", price: 64, mrp: 66, availability: true, category: "dairy", platform: "instamart" },
  { id: "im_006", name: "Taaza Toned Milk", brand: "Amul", size: "500ml", unit: "ml", price: 29, mrp: 28, availability: true, category: "dairy", platform: "instamart" },
  { id: "im_007", name: "Taaza Toned Milk", brand: "Amul", size: "1L", unit: "L", price: 56, mrp: 54, availability: false, category: "dairy", platform: "instamart" },
  // Eggs
  { id: "im_008", name: "Farm Fresh White Eggs", brand: "Country Delight", size: "6 pcs", unit: "pcs", price: 44, mrp: 50, availability: true, category: "eggs", platform: "instamart" },
  { id: "im_009", name: "Farm Fresh White Eggs", brand: "Country Delight", size: "12 pcs", unit: "pcs", price: 84, mrp: 96, availability: true, category: "eggs", platform: "instamart" },
  // Maggi
  { id: "im_010", name: "2-Minute Noodles Masala", brand: "Maggi", size: "70g", unit: "g", price: 14, mrp: 16, availability: true, category: "instant_food", platform: "instamart" },
  { id: "im_011", name: "2-Minute Noodles Masala", brand: "Maggi", size: "280g", unit: "g", price: 54, mrp: 64, availability: true, category: "instant_food", platform: "instamart" },
  // Lays
  { id: "im_012", name: "Classic Salted Chips", brand: "Lay's", size: "26g", unit: "g", price: 20, mrp: 20, availability: true, category: "snacks", platform: "instamart" },
  { id: "im_013", name: "Classic Salted Chips", brand: "Lay's", size: "52g", unit: "g", price: 28, mrp: 30, availability: true, category: "snacks", platform: "instamart" },
  // Coca-Cola
  { id: "im_014", name: "Cola", brand: "Coca-Cola", size: "250ml", unit: "ml", price: 28, mrp: 30, availability: true, category: "beverages", platform: "instamart" },
  { id: "im_015", name: "Cola", brand: "Coca-Cola", size: "750ml", unit: "ml", price: 45, mrp: 47, availability: true, category: "beverages", platform: "instamart" },
  // Bread
  { id: "im_016", name: "Milk Bread", brand: "Britannia", size: "400g", unit: "g", price: 43, mrp: 50, availability: true, category: "bakery", platform: "instamart" },
  // Amul Butter
  { id: "im_017", name: "Pasteurised Butter", brand: "Amul", size: "100g", unit: "g", price: 52, mrp: 56, availability: true, category: "dairy", platform: "instamart" },
  { id: "im_018", name: "Pasteurised Butter", brand: "Amul", size: "500g", unit: "g", price: 252, mrp: 268, availability: true, category: "dairy", platform: "instamart" },
  // Sprite
  { id: "im_019", name: "Lemon Lime Drink", brand: "Sprite", size: "750ml", unit: "ml", price: 41, mrp: 47, availability: true, category: "beverages", platform: "instamart" },
  // Parle-G
  { id: "im_020", name: "Glucose Biscuits", brand: "Parle-G", size: "100g", unit: "g", price: 10, mrp: 10, availability: true, category: "biscuits", platform: "instamart" },
  // KitKat
  { id: "im_021", name: "Chocolate Wafer Bar", brand: "KitKat", size: "13.2g", unit: "g", price: 14, mrp: 15, availability: true, category: "chocolates", platform: "instamart" },
  // Tropicana
  { id: "im_022", name: "Orange 100% Juice", brand: "Tropicana", size: "1L", unit: "L", price: 140, mrp: 155, availability: true, category: "juices", platform: "instamart" },
  // Haldirams
  { id: "im_023", name: "Aloo Bhujia", brand: "Haldiram's", size: "200g", unit: "g", price: 68, mrp: 75, availability: true, category: "snacks", platform: "instamart" },
  // Surf Excel
  { id: "im_024", name: "Quick Wash Detergent", brand: "Surf Excel", size: "500g", unit: "g", price: 105, mrp: 119, availability: true, category: "household", platform: "instamart" },
  // Dettol
  { id: "im_025", name: "Original Soap", brand: "Dettol", size: "75g", unit: "g", price: 46, mrp: 52, availability: true, category: "personal_care", platform: "instamart" },
  // Monster
  { id: "im_026", name: "Energy Drink Original", brand: "Monster", size: "500ml", unit: "ml", price: 112, mrp: 120, availability: false, category: "beverages", platform: "instamart" },
  // Sting
  { id: "im_027", name: "Berry Blast Energy Drink", brand: "Sting", size: "250ml", unit: "ml", price: 29, mrp: 30, availability: true, category: "beverages", platform: "instamart" },
  // Vim
  { id: "im_028", name: "Dishwash Bar", brand: "Vim", size: "200g", unit: "g", price: 28, mrp: 32, availability: true, category: "household", platform: "instamart" },
  // Munch
  { id: "im_029", name: "Chocolate Bar", brand: "Nestle Munch", size: "50g", unit: "g", price: 28, mrp: 30, availability: true, category: "chocolates", platform: "instamart" },
  // Dairy Milk
  { id: "im_030", name: "Silk Chocolate", brand: "Cadbury", size: "65g", unit: "g", price: 90, mrp: 99, availability: true, category: "chocolates", platform: "instamart" },
];
