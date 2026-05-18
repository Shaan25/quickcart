"use client";

import type { SortOption } from "../lib/types";

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: "lowest_price",    label: "Lowest Price"    },
  { value: "best_value",      label: "Best Value"      },
  { value: "most_discounted", label: "Most Discounted" },
];

interface SortFilterProps {
  value: SortOption;
  onChange: (sort: SortOption) => void;
}

export function SortFilter({ value, onChange }: SortFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500 font-medium">Sort:</span>
      <div className="flex gap-1 flex-wrap">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              value === opt.value
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
