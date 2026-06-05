import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ places: [] });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ places: [], error: "no_key" });

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    url.searchParams.set("query", `${q} restaurant Paris`);
    url.searchParams.set("type", "restaurant|bar|night_club");
    url.searchParams.set("language", "fr");
    url.searchParams.set("key", key);

    const res = await fetch(url.toString());
    if (!res.ok) return NextResponse.json({ places: [], error: "api_error" });

    const data = await res.json();
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json({ places: [], error: data.status });
    }

    const places = (data.results ?? []).slice(0, 12).map((p: {
      place_id: string;
      name: string;
      formatted_address: string;
      rating?: number;
      user_ratings_total?: number;
      photos?: { photo_reference: string; width: number; height: number }[];
      types?: string[];
      opening_hours?: { open_now: boolean };
      price_level?: number;
    }) => ({
      id: p.place_id,
      name: p.name,
      address: p.formatted_address,
      rating: p.rating ?? null,
      totalRatings: p.user_ratings_total ?? 0,
      photoRef: p.photos?.[0]?.photo_reference ?? null,
      photoCount: p.photos?.length ?? 0,
      types: p.types ?? [],
      openNow: p.opening_hours?.open_now ?? null,
      priceLevel: p.price_level ?? null,
    }));

    return NextResponse.json({ places });
  } catch (err) {
    return NextResponse.json({ places: [], error: String(err) }, { status: 500 });
  }
}
