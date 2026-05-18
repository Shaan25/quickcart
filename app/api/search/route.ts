import { NextRequest, NextResponse } from "next/server";
import { adapters } from "../../../adapters";
import { normalizeProduct } from "../../../lib/normalizer";
import { searchProducts, groupProducts } from "../../../lib/matchingEngine";
import { sortGroups } from "../../../lib/comparisonEngine";
import type { SearchResponse, SortOption, LocationCoords } from "../../../lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const sortBy = (searchParams.get("sort") as SortOption) ?? "lowest_price";
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const locationLabel = searchParams.get("locationLabel") ?? undefined;
  const locationCity = searchParams.get("locationCity") ?? undefined;

  const location: LocationCoords | undefined =
    latParam && lngParam
      ? { lat: parseFloat(latParam), lng: parseFloat(lngParam), label: locationLabel, city: locationCity }
      : undefined;

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  const startTime = Date.now();

  try {
    // Fetch from all platform adapters in parallel
    const rawResults = await Promise.allSettled(
      adapters.map((adapter) => adapter.search(query, location))
    );

    const allRaw = rawResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );

    // Normalize all products
    const normalized = allRaw.map(normalizeProduct);

    // Search + score products
    const matched = searchProducts(normalized, query);

    // Group into comparable product groups
    const groups = groupProducts(matched);

    // Sort by user preference
    const sorted = sortGroups(groups, sortBy);

    const response: SearchResponse = {
      query,
      groups: sorted,
      totalProducts: allRaw.length,
      searchTime: Date.now() - startTime,
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}
