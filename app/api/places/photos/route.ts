import { NextRequest, NextResponse } from "next/server";

// Returns all photo references for a place
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("id");
  if (!placeId) return NextResponse.json({ photos: [], error: "no_id" });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ photos: [], error: "no_key" });

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "name,photos,formatted_address,rating,website,opening_hours");
    url.searchParams.set("language", "fr");
    url.searchParams.set("key", key);

    const res = await fetch(url.toString());
    if (!res.ok) return NextResponse.json({ photos: [], error: "api_error" });

    const data = await res.json();
    if (data.status !== "OK") return NextResponse.json({ photos: [], error: data.status });

    const photos = (data.result?.photos ?? []).slice(0, 20).map((p: {
      photo_reference: string;
      width: number;
      height: number;
      html_attributions?: string[];
    }) => ({
      ref: p.photo_reference,
      width: p.width,
      height: p.height,
    }));

    return NextResponse.json({
      photos,
      name: data.result?.name ?? "",
      address: data.result?.formatted_address ?? "",
    });
  } catch (err) {
    return NextResponse.json({ photos: [], error: String(err) }, { status: 500 });
  }
}
