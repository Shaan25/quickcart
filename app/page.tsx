import { Suspense } from "react";
import { SearchBar } from "../components/SearchBar";
import { SearchResults } from "../components/SearchResults";
import { RecentSearches } from "../components/RecentSearches";
import { LocationPicker } from "../components/LocationPicker";
import { BasketButton } from "../components/BasketButton";

function PlatformDot({ name, color }: { name: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-gray-500">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {name}
    </span>
  );
}

interface HomeProps {
  searchParams: Promise<{ q?: string; sort?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const sort = params.sort ?? "lowest_price";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-gray-900">QuickCart</span>
            <span className="hidden rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500 sm:block">
              Price Compare
            </span>
          </a>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3">
              <PlatformDot name="Blinkit" color="bg-green-500" />
              <PlatformDot name="Instamart" color="bg-orange-500" />
              <PlatformDot name="Zepto" color="bg-purple-500" />
            </div>
            <Suspense>
              <LocationPicker />
            </Suspense>
            <BasketButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {!query ? (
          /* Home / Landing State */
          <div>
            <div className="mb-10 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Compare grocery prices<br />
                <span className="text-gray-400">across Blinkit, Instamart & Zepto</span>
              </h1>
              <p className="mt-3 text-gray-500">
                Find the cheapest option instantly. Price per unit calculated automatically.
              </p>
            </div>
            <Suspense>
              <SearchBar autoFocus size="lg" />
              <RecentSearches />
            </Suspense>

            {/* How it works */}
            <div className="mt-12 grid grid-cols-3 gap-4">
              {[
                { icon: "🔍", title: "Search", desc: "Type any product name" },
                { icon: "⚖️", title: "Compare", desc: "Prices across all 3 platforms" },
                { icon: "💰", title: "Save", desc: "Pick the cheapest option" },
              ].map((step) => (
                <div key={step.title} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                  <div className="text-2xl mb-2">{step.icon}</div>
                  <p className="font-semibold text-sm text-gray-900">{step.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Search Results State */
          <div>
            <div className="mb-6">
              <Suspense>
                <SearchBar size="md" />
              </Suspense>
            </div>
            <Suspense
              fallback={
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-200" />
                  ))}
                </div>
              }
            >
              <SearchResults query={query} sort={sort} />
            </Suspense>
          </div>
        )}
      </main>

      <footer className="mt-16 border-t border-gray-200 py-6">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-center text-xs text-gray-400">
            QuickCart uses mock data for demonstration. Prices are approximate.{" "}
            <span className="font-medium">Not affiliated with Blinkit, Swiggy Instamart, or Zepto.</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
