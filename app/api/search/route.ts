import { NextRequest, NextResponse } from "next/server";
import { adapters } from "../../../adapters";
import { normalizeProduct } from "../../../lib/normalizer";
import { searchProducts, groupProducts } from "../../../lib/matchingEngine";
import type { SearchResponse, LocationCoords } from "../../../lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
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

  function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("adapter timeout")), ms)
      ),
    ]);
  }

  try {
    // Run adapters sequentially to avoid OOM on 512MB Render — parallel 3x browser contexts crashes
    const rawResults: PromiseSettledResult<import("../../../lib/types").RawProduct[]>[] = [];
    for (const adapter of adapters) {
      const result = await withTimeout(adapter.search(query, location), 30000)
        .then((value) => ({ status: "fulfilled" as const, value }))
        .catch((reason) => ({ status: "rejected" as const, reason }));
      rawResults.push(result);
      if (result.status === "rejected") {
        console.error(`[search] ${adapter.platform} failed:`, result.reason);
      }
    }

    const allRaw = rawResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );

    // Normalize all products
    const normalized = allRaw.map(normalizeProduct);

    // Search + score products
    const matched = searchProducts(normalized, query);

    // Group into comparable product groups
    const groups = groupProducts(matched);

    const response: SearchResponse = {
      query,
      groups,
      totalProducts: allRaw.length,
      searchTime: Date.now() - startTime,
      locationBased: !!location,
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}
