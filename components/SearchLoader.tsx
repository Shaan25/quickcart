"use client";

import { useState, useEffect } from "react";

const MESSAGES = [
  "Scraping live prices from all 3 platforms...",
  "Asking Blinkit what's in stock...",
  "Checking BigBasket's latest prices...",
  "Querying Zepto's inventory...",
  "Comparing unit prices for the best deal...",
  "Almost there, crunching numbers...",
  "Fetching fresh data just for you...",
  "Finding the cheapest option across platforms...",
];

const PLATFORMS = [
  { name: "Blinkit",    dot: "bg-green-500",  ring: "ring-green-200"  },
  { name: "BigBasket",  dot: "bg-red-500",    ring: "ring-red-200"    },
  { name: "Zepto",      dot: "bg-purple-500", ring: "ring-purple-200" },
];

export function SearchLoader({ query }: { query: string }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const rotate = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % MESSAGES.length);
        setFade(true);
      }, 300);
    }, 3000);
    return () => clearInterval(rotate);
  }, []);

  // Fake per-platform progress: each platform "activates" after a few seconds
  const platformActive = PLATFORMS.map((_, i) => elapsed >= i * 2);

  return (
    <div className="flex flex-col items-center py-12 select-none">
      {/* Title */}
      <div className="mb-2 text-base font-semibold text-gray-800">
        Searching for &ldquo;{query}&rdquo;
      </div>
      <div
        className="mb-8 text-sm text-gray-500 transition-opacity duration-300"
        style={{ opacity: fade ? 1 : 0 }}
      >
        {MESSAGES[msgIndex]}
      </div>

      {/* Platform cards */}
      <div className="mb-8 flex gap-4">
        {PLATFORMS.map((p, i) => (
          <div
            key={p.name}
            className={`flex flex-col items-center gap-2 rounded-xl border bg-white px-5 py-4 shadow-sm transition-all duration-500 ${
              platformActive[i] ? `ring-2 ${p.ring} border-transparent` : "border-gray-200 opacity-40"
            }`}
          >
            <div className="relative flex h-8 w-8 items-center justify-center">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${p.dot} opacity-30`} />
              <span className={`relative inline-flex h-4 w-4 rounded-full ${p.dot}`} />
            </div>
            <span className="text-xs font-medium text-gray-700">{p.name}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-64 overflow-hidden rounded-full bg-gray-100 h-1.5">
        <div
          className="h-full rounded-full bg-gray-400 transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(95, elapsed * 3.5)}%` }}
        />
      </div>

      <p className="mt-3 text-xs text-gray-400">{elapsed}s elapsed · live prices take ~15–25s</p>
    </div>
  );
}
