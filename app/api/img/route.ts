import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = [
  "cdn.grofers.com",
  "cdn.blinkit.com",
  "assets.blinkit.com",
  "www.bigbasket.com",
  "bigbasket.com",
  "cdn.zeptonow.com",
];

const REFERERS: Record<string, string> = {
  "cdn.grofers.com":    "https://blinkit.com/",
  "cdn.blinkit.com":   "https://blinkit.com/",
  "assets.blinkit.com":"https://blinkit.com/",
  "www.bigbasket.com": "https://www.bigbasket.com/",
  "bigbasket.com":     "https://www.bigbasket.com/",
  "cdn.zeptonow.com":  "https://www.zeptonow.com/",
};

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) return new Response("Missing url", { status: 400 });

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
    const u = new URL(decoded);
    if (!ALLOWED_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith("." + h))) {
      return new Response("Forbidden", { status: 403 });
    }
    const referer = REFERERS[u.hostname] ?? (u.origin + "/");

    const res = await fetch(decoded, {
      headers: {
        "Referer": referer,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!res.ok) return new Response("Not found", { status: 404 });

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("Error", { status: 500 });
  }
}
