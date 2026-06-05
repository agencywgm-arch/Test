import { NextRequest, NextResponse } from "next/server";

// Proxy a single Google Places photo — hides the API key from the client
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref");
  const maxw = req.nextUrl.searchParams.get("maxw") ?? "800";

  if (!ref || !/^[A-Za-z0-9_\-]+$/.test(ref)) {
    return new NextResponse("Bad ref", { status: 400 });
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return new NextResponse("No API key", { status: 503 });

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/photo");
    url.searchParams.set("photo_reference", ref);
    url.searchParams.set("maxwidth", maxw);
    url.searchParams.set("key", key);

    // Google redirects to the actual image — follow redirects
    const res = await fetch(url.toString(), { redirect: "follow" });
    if (!res.ok) return new NextResponse("Upstream error", { status: 502 });

    const data = await res.arrayBuffer();
    const ct = res.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(data, {
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new NextResponse(String(err), { status: 500 });
  }
}
