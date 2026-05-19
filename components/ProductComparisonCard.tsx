"use client";

import type { ProductGroup, NormalizedProduct, Platform } from "../lib/types";
import { PlatformBadge } from "./PlatformBadge";
import { discountPct, getPlatformSearchUrl } from "../lib/comparisonEngine";
import { useBasket } from "./BasketContext";

const PLATFORM_ORDER: Platform[] = ["blinkit", "bigbasket", "zepto"];

function PlatformCell({
  product,
  isCheapest,
  isBestValue,
  productName,
  brand,
  platform,
}: {
  product: NormalizedProduct | undefined;
  isCheapest: boolean;
  isBestValue: boolean;
  productName: string;
  brand: string;
  platform: Platform;
}) {
  const buyUrl = getPlatformSearchUrl(platform, brand, productName);

  if (!product) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-center">
        <p className="text-xs text-gray-400">Not listed</p>
      </div>
    );
  }

  if (!product.availability) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs font-medium text-gray-400 mb-1">₹{product.price}</p>
        <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          Out of stock
        </span>
      </div>
    );
  }

  const discount = discountPct(product);
  const isEstimated =
    platform === "blinkit" ||
    (platform === "bigbasket" && !product.id.startsWith("bb_live_")) ||
    (platform === "zepto" && !product.id.startsWith("zt_live_"));

  return (
    <div className={`relative rounded-lg border p-3 transition-all ${isCheapest ? "border-emerald-200 bg-emerald-50 ring-1 ring-emerald-200" : "border-gray-200 bg-white hover:border-gray-300"}`}>
      {isCheapest && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white whitespace-nowrap">
          Cheapest ✓
        </span>
      )}
      {!isCheapest && isBestValue && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white whitespace-nowrap">
          Best Value
        </span>
      )}
      <div className="mb-2 flex justify-center">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/img?url=${encodeURIComponent(product.imageUrl)}`}
            alt={product.name}
            className="h-14 w-14 object-contain"
          />
        ) : null}
      </div>
      <p className="text-lg font-bold text-gray-900">₹{product.price}</p>
      {product.mrp && product.mrp > product.price && (
        <div className="flex items-center gap-1">
          <p className="text-xs text-gray-400 line-through">₹{product.mrp}</p>
          <span className="text-[10px] font-semibold text-red-500">{discount}% off</span>
        </div>
      )}
      <p className="mt-1 text-xs text-gray-500">{product.unitLabel} @ ₹{product.unitPrice.toFixed(1)}</p>
      {isEstimated && (
        <span className="mt-1 inline-block text-[9px] text-amber-600 italic">~ est. price</span>
      )}
      <a
        href={buyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-700 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        Buy →
      </a>
    </div>
  );
}

interface ProductComparisonCardProps {
  group: ProductGroup;
  visiblePlatforms?: Platform[];
}

export function ProductComparisonCard({ group, visiblePlatforms }: ProductComparisonCardProps) {
  const { items, addItem, updateQty } = useBasket();
  const basketEntry = items.find((i) => i.groupId === group.groupId);

  const platformMap = new Map(group.variants.map((v) => [v.platform, v]));
  const activePlatforms = visiblePlatforms ?? PLATFORM_ORDER;
  const colCount = activePlatforms.length;
  const gridClass = colCount === 1 ? "grid-cols-1" : colCount === 2 ? "grid-cols-2" : "grid-cols-3";

  const savings =
    group.cheapest && group.variants.filter((v) => v.availability).length > 1
      ? Math.max(...group.variants.filter((v) => v.availability).map((v) => v.price)) - group.cheapest.price
      : 0;

  const rep = group.variants[0];
  const brand = rep?.brand ?? "";
  const productName = rep?.name ?? group.productName;

  function handleAddToBasket() {
    const platforms: Partial<Record<Platform, { price: number; availability: boolean }>> = {};
    for (const v of group.variants) {
      platforms[v.platform] = { price: v.price, availability: v.availability };
    }
    addItem({ groupId: group.groupId, productName: group.productName, category: group.category, platforms });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-base">{group.productName}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {[...new Set(group.variants.map((v) => v.size))].map((size) => (
                <span key={size} className="text-xs text-gray-500">{size}</span>
              ))}
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-400 capitalize">{group.category.replace("_", " ")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {savings > 0 && (
              <div className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1">
                <p className="text-xs font-medium text-amber-700">Save ₹{savings}</p>
              </div>
            )}
            {basketEntry ? (
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button
                  className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-sm"
                  onClick={() => updateQty(group.groupId, basketEntry.quantity - 1)}
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-medium text-gray-800">{basketEntry.quantity}</span>
                <button
                  className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-sm"
                  onClick={() => updateQty(group.groupId, basketEntry.quantity + 1)}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToBasket}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 transition-colors"
              >
                + Basket
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className={`grid ${gridClass} gap-3`}>
          {activePlatforms.map((platform) => (
            <div key={platform}>
              <div className="mb-2">
                <PlatformBadge platform={platform} size="sm" showLiveStatus />
              </div>
              <PlatformCell
                product={platformMap.get(platform)}
                isCheapest={!!(group.cheapest && platformMap.get(platform)?.id === group.cheapest.id)}
                isBestValue={!!(group.bestValue && platformMap.get(platform)?.id === group.bestValue.id)}
                productName={productName}
                brand={brand}
                platform={platform}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
