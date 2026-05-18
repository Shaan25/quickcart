import { NextRequest, NextResponse } from "next/server";

// 3-digit pincode prefixes where at least one quick-commerce platform operates in India.
// Pincodes outside this set are treated as non-serviceable.
const SERVICEABLE_PREFIXES = new Set([
  // Delhi NCR
  110, 111,
  120, 121, 122, 123, 124,
  130, 131, 132, 133, 134,
  201, 202, 203, 204,
  // Punjab / Chandigarh
  140, 141, 143, 144, 147,
  160, 161, 162,
  // UP
  206, 208,
  211, 212,
  221,
  226, 227,
  250, 251,
  282,
  // Uttarakhand
  248, 249,
  // Rajasthan
  302, 303, 304, 305, 306,
  313, 314,
  324, 325,
  342,
  // Gujarat
  380, 382, 383,
  390, 391, 392, 393,
  394, 395, 396,
  // Maharashtra
  400, 401, 402, 403,
  410, 411, 412, 413, 414, 415, 416,
  421, 422, 431,
  440, 441, 442,
  // Madhya Pradesh
  452, 453, 454,
  462, 463,
  // Chhattisgarh
  492, 493,
  // Telangana / AP
  500, 501, 502, 503, 504, 505, 506, 507, 508,
  520, 521, 522,
  530, 531,
  // Karnataka
  560, 561, 562, 563, 564, 565,
  570, 571, 572, 573, 574, 575, 576,
  // Tamil Nadu
  600, 601, 602, 603,
  620, 621, 622,
  625, 626, 627, 628,
  641, 642, 643, 644, 645,
  // Kerala
  682, 683, 685, 686,
  695, 696,
  // West Bengal
  700, 701, 702, 703, 704, 705, 706, 707, 708, 709,
  711, 712,
  // Odisha
  751, 752, 753, 754, 755,
  // Assam
  781, 782, 783,
  // Bihar
  800, 801, 802, 803, 804, 805, 806,
  // Jharkhand
  834, 835, 836,
]);

function isServiceable(pincode: string): boolean {
  const prefix = parseInt(pincode.slice(0, 3), 10);
  return SERVICEABLE_PREFIXES.has(prefix);
}

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
      serviceable: isServiceable(pincode),
    });
  } catch {
    return NextResponse.json({ error: "Could not look up this pincode. Try again." }, { status: 500 });
  }
}
