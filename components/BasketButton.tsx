"use client";

import { useState } from "react";
import { useBasket } from "./BasketContext";
import { BasketDrawer } from "./BasketDrawer";

export function BasketButton() {
  const { totalCount } = useBasket();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        aria-label="Open basket"
      >
        <span>🛒</span>
        {totalCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>
      <BasketDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
