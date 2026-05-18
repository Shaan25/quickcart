"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { SortOption } from "../lib/types";

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: "lowest_price", label: "Lowest Price" },
  { value: "best_value", label: "Best Value" },
  { value: "most_discounted", label: "Most Discounted" },
  { value: "platform", label: "By Platform" },
];

export function SortFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("sort") as SortOption) ?? "lowest_price";

  const handleChange = (sort: SortOption) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500 font-medium">Sort:</span>
      <div className="flex gap-1 flex-wrap">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              current === opt.value
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
