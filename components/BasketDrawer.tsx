"use client";

import { useBasket } from "./BasketContext";
import type { Platform } from "../lib/types";

const PLATFORMS: Platform[] = ["blinkit", "jiomart", "zepto"];

const PLATFORM_META: Record<Platform, { label: string; color: string; bg: string }> = {
  blinkit: { label: "Blinkit", color: "text-green-700",  bg: "bg-green-50"  },
  jiomart: { label: "JioMart", color: "text-blue-700",   bg: "bg-blue-50"   },
  zepto:   { label: "Zepto",   color: "text-purple-700", bg: "bg-purple-50" },
};

interface BasketDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function BasketDrawer({ open, onClose }: BasketDrawerProps) {
  const { items, removeItem, updateQty, clearBasket } = useBasket();

  const totals: Partial<Record<Platform, number>> = {};
  for (const platform of PLATFORMS) {
    let total = 0;
    let complete = true;
    for (const item of items) {
      const p = item.platforms[platform];
      if (!p || !p.availability) { complete = false; break; }
      total += p.price * item.quantity;
    }
    if (complete && items.length > 0) totals[platform] = total;
  }

  const totalEntries = Object.entries(totals) as [Platform, number][];
  const cheapest = totalEntries.sort(([, a], [, b]) => a - b)[0]?.[0];
  const maxTotal = totalEntries.length > 1 ? Math.max(...totalEntries.map(([, v]) => v)) : undefined;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            Basket {items.length > 0 && <span className="text-gray-400 font-normal text-sm">({items.reduce((s, i) => s + i.quantity, 0)} items)</span>}
          </h2>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button onClick={clearBasket} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                Clear all
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
            <span className="text-5xl">🛒</span>
            <p className="text-sm">Your basket is empty</p>
            <p className="text-xs text-gray-300">Add items while comparing prices</p>
          </div>
        ) : (
          <>
            {/* Items */}
            <ul className="flex-1 overflow-y-auto divide-y divide-gray-50 px-5">
              {items.map((item) => (
                <li key={item.groupId} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                      <div className="mt-1 flex gap-2 flex-wrap">
                        {PLATFORMS.map((p) => {
                          const pd = item.platforms[p];
                          if (!pd) return null;
                          return (
                            <span
                              key={p}
                              className={`text-xs ${pd.availability ? "text-gray-500" : "text-gray-300 line-through"}`}
                            >
                              {PLATFORM_META[p].label}: ₹{pd.price}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-sm"
                          onClick={() => updateQty(item.groupId, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-medium text-gray-800">{item.quantity}</span>
                        <button
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-sm"
                          onClick={() => updateQty(item.groupId, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.groupId)}
                        className="text-gray-300 hover:text-red-400 text-sm leading-none transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Platform totals */}
            <div className="border-t border-gray-100 px-5 py-4 space-y-2 bg-gray-50">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Basket Total by Platform
              </p>
              {PLATFORMS.map((p) => {
                const total = totals[p];
                const isCheapest = p === cheapest;
                const meta = PLATFORM_META[p];
                return (
                  <div
                    key={p}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                      isCheapest ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-white border border-gray-100"
                    }`}
                  >
                    <span className={`text-sm font-medium ${isCheapest ? "text-emerald-700" : meta.color}`}>
                      {meta.label}
                      {isCheapest && (
                        <span className="ml-2 text-[9px] bg-emerald-500 text-white rounded-full px-1.5 py-0.5 uppercase tracking-wide">
                          Best
                        </span>
                      )}
                    </span>
                    {total !== undefined ? (
                      <span className={`text-sm font-bold ${isCheapest ? "text-emerald-700" : "text-gray-900"}`}>
                        ₹{total}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 italic">Not fully available</span>
                    )}
                  </div>
                );
              })}
              {cheapest && maxTotal !== undefined && totals[cheapest] !== undefined && maxTotal > totals[cheapest]! && (
                <p className="text-center text-xs text-emerald-600 font-medium pt-1">
                  Save ₹{maxTotal - totals[cheapest]!} by ordering from {PLATFORM_META[cheapest].label}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
