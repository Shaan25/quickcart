import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const pincode = request.nextUrl.searchParams.get("pincode")?.trim();
  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ error: "Enter a valid 6-digit pincode" }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "QuickCart/1.0 (grocery price comparison app)" },
    });

    if (!res.ok) throw new Error("Nominatim request failed");

    const results = await res.json() as Array<{
      lat: string;
      lon: string;
      display_name: string;
      address?: {
        suburb?: string; city?: string; town?: string;
        county?: string; state?: string; village?: string;
        state_district?: string; municipality?: string;
      };
    }>;

    if (!results.length) {
      return NextResponse.json({ error: "Pincode not found. Try a different one." }, { status: 404 });
    }

    const place = results[0];
    const addr = place.address ?? {};
    const area = addr.suburb ?? addr.village ?? addr.county ?? "";
    const city = addr.city ?? addr.town ?? addr.state_district ?? addr.municipality ?? addr.state ?? "";
    const label = [area, city].filter(Boolean).join(", ") || place.display_name.split(",")[0];

    return NextResponse.json({
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      label,
      city: city || label,
    });
  } catch {
    return NextResponse.json({ error: "Could not look up this pincode. Try again." }, { status: 500 });
  }
}
