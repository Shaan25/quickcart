"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const POPULAR_SEARCHES = ["Red Bull", "Amul Milk", "Eggs", "Maggi", "Lay's", "Coca-Cola", "Bread", "Cadbury Silk"];

interface SearchBarProps {
  autoFocus?: boolean;
  size?: "lg" | "md";
}

export function SearchBar({ autoFocus = false, size = "lg" }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 2) return;
    router.push(`/?q=${encodeURIComponent(trimmed)}`);
  };

  const handlePopular = (term: string) => {
    setValue(term);
    router.push(`/?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className={`relative flex items-center rounded-xl border border-gray-200 bg-white shadow-sm focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100 transition-all ${size === "lg" ? "text-base" : "text-sm"}`}>
          <span className="pl-4 text-gray-400">
            <svg className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search groceries — Red Bull, Amul Milk, Eggs..."
            className={`flex-1 bg-transparent py-3.5 pl-3 pr-4 text-gray-900 placeholder-gray-400 outline-none ${size === "lg" ? "text-base" : "text-sm"}`}
          />
          {value && (
            <button type="button" onClick={() => setValue("")} className="pr-2 text-gray-400 hover:text-gray-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button type="submit" className={`m-1.5 rounded-lg bg-gray-900 font-medium text-white transition-colors hover:bg-gray-700 ${size === "lg" ? "px-5 py-2.5 text-sm" : "px-4 py-2 text-xs"}`}>
            Search
          </button>
        </div>
      </form>

      {size === "lg" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-gray-400">Popular:</span>
          {POPULAR_SEARCHES.map((term) => (
            <button key={term} onClick={() => handlePopular(term)} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50">
              {term}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
