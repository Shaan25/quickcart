import { NextRequest, NextResponse } from "next/server";
import { adapters } from "../../../adapters";
import { normalizeProduct } from "../../../lib/normalizer";
import { groupProducts } from "../../../lib/matchingEngine";

export const dynamic = "force-dynamic";

// GET /api/compare?ids=bk_001,im_001,zp_001
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json({ error: "ids parameter required" }, { status: 400 });
  }

  const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);

  if (ids.length === 0 || ids.length > 20) {
    return NextResponse.json({ error: "Provide 1-20 product IDs" }, { status: 400 });
  }

  try {
    const productPromises = ids.flatMap((id) =>
      adapters.map((adapter) => adapter.getById(id))
    );

    const rawProducts = (await Promise.all(productPromises)).filter(Boolean);
    const normalized = rawProducts.map((p) => normalizeProduct(p!));
    const groups = groupProducts(normalized);

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Compare error:", error);
    return NextResponse.json({ error: "Comparison failed" }, { status: 500 });
  }
}
