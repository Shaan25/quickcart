"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "quickcart_recent";
const MAX_RECENT = 6;

export function useRecentSearches() {
  const [searches, setSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSearches(JSON.parse(stored));
    } catch {}
  }, []);

  const addSearch = (query: string) => {
    setSearches((prev) => {
      const deduped = [query, ...prev.filter((s) => s.toLowerCase() !== query.toLowerCase())];
      const trimmed = deduped.slice(0, MAX_RECENT);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)); } catch {}
      return trimmed;
    });
  };

  const clearSearches = () => {
    setSearches([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return { searches, addSearch, clearSearches };
}

export function RecentSearches({ onSelect }: { onSelect?: (q: string) => void }) {
  const router = useRouter();
  const { searches, clearSearches } = useRecentSearches();

  if (searches.length === 0) return null;

  const handleSelect = (q: string) => {
    onSelect?.(q);
    router.push(`/?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent Searches</span>
        <button onClick={clearSearches} className="text-xs text-gray-400 hover:text-gray-600">Clear all</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {searches.map((q) => (
          <button key={q} onClick={() => handleSelect(q)} className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition-colors hover:border-gray-300">
            <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
