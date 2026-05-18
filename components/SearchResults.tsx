"use client";

import { useEffect, useState } from "react";
import { ProductComparisonCard } from "./ProductComparisonCard";
import { SearchLoader } from "./SearchLoader";
import { SortFilter } from "./SortFilter";
import { useRecentSearches } from "./RecentSearches";
import { useLocation } from "./LocationPicker";
import { sortGroups } from "../lib/comparisonEngine";
import type { Platform, SearchResponse, SortOption } from "../lib/types";

const PLATFORMS: { value: Platform; label: string; color: string }[] = [
  { value: "blinkit",   label: "Blinkit",   color: "bg-green-500" },
  { value: "bigbasket", label: "BigBasket", color: "bg-red-500"    },
  { value: "zepto",     label: "Zepto",     color: "bg-purple-500" },
];

interface SearchResultsProps {
  query: string;
  sort: string;
}

export function SearchResults({ query, sort: initialSort }: SearchResultsProps) {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [sort, setSort] = useState<SortOption>((initialSort as SortOption) ?? "lowest_price");
  const { addSearch } = useRecentSearches();
  const { location, clearLocation } = useLocation();

  useEffect(() => {
    if (!query) return;
    if (location?.serviceable === false) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);

    const params: Record<string, string> = { q: query };
    if (location) {
      params.lat = String(location.lat);
      params.lng = String(location.lng);
      if (location.label) params.locationLabel = location.label;
      if (location.city) params.locationCity = location.city;
    }

    fetch(`/api/search?${new URLSearchParams(params)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((e) => Promise.reject(e.error));
        return res.json();
      })
      .then((json: SearchResponse) => {
        setData(json);
        addSearch(query);
      })
      .catch((err) => setError(typeof err === "string" ? err : "Something went wrong."))
      .finally(() => setLoading(false));
  }, [query, location?.lat, location?.lng]);

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const sortedGroups = data ? sortGroups(data.groups, sort) : [];
  const visibleGroups = sortedGroups.filter((g) =>
    selectedPlatforms.length === 0
      ? true
      : g.variants.some((v) => selectedPlatforms.includes(v.platform))
  );

  if (loading) return <SearchLoader query={query} />;

  if (error) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-red-600 font-medium">{error}</p>
      <p className="text-sm text-red-400 mt-1">Check your connection and try again.</p>
    </div>
  );

  if (location?.serviceable === false) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
        <div className="mb-3 text-4xl">📍</div>
        <h3 className="font-semibold text-gray-900">Area not serviceable</h3>
        <p className="mt-2 text-sm text-gray-600">
          Blinkit, BigBasket, and Zepto don&apos;t currently deliver to{" "}
          <span className="font-medium">{location.label}</span>.
        </p>
        <button
          onClick={clearLocation}
          className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-700 transition-colors"
        >
          Search without location
        </button>
      </div>
    );
  }

  if (!data || data.groups.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="mb-3 text-4xl">🔍</div>
        <h3 className="font-semibold text-gray-900">No products found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Try a different spelling or browse popular items.
        </p>
      </div>
    );
  }

  return (
    <div>
      {location && (
        <div className="mb-4 flex items-center gap-1.5 text-xs text-gray-500">
          <span>📍</span>
          <span>Showing prices for <span className="font-medium text-gray-700">{location.label}</span></span>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">
            Results for &ldquo;{query}&rdquo;
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {visibleGroups.length} of {data.groups.length} product{data.groups.length !== 1 ? "s" : ""} · {data.searchTime}ms
          </p>
        </div>
        <SortFilter value={sort} onChange={setSort} />
      </div>

      {/* Platform filter chips */}
      <div className="mb-5 flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium">Filter:</span>
        {PLATFORMS.map((p) => {
          const active = selectedPlatforms.includes(p.value);
          return (
            <button
              key={p.value}
              onClick={() => togglePlatform(p.value)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                active
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : p.color}`} />
              {p.label}
            </button>
          );
        })}
        {selectedPlatforms.length > 0 && (
          <button
            onClick={() => setSelectedPlatforms([])}
            className="text-xs text-gray-400 hover:text-gray-600 ml-1"
          >
            Clear
          </button>
        )}
      </div>

      {visibleGroups.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500 text-sm">No products found on the selected platforms.</p>
          <button onClick={() => setSelectedPlatforms([])} className="mt-2 text-xs text-gray-400 hover:text-gray-600">
            Clear filter
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleGroups.map((group) => (
            <ProductComparisonCard
              key={group.groupId}
              group={group}
              visiblePlatforms={selectedPlatforms.length > 0 ? selectedPlatforms : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
