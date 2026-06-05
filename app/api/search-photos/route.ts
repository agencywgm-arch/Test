import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const page = req.nextUrl.searchParams.get("page") ?? "1";

  if (!q.trim()) {
    return NextResponse.json({ photos: [], error: "no query" });
  }

  const key = process.env.UNSPLASH_ACCESS_KEY;

  // No API key — return empty so the UI shows the fallback message
  if (!key) {
    return NextResponse.json({ photos: [], error: "no_key" });
  }

  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", q);
    url.searchParams.set("per_page", "12");
    url.searchParams.set("page", page);
    url.searchParams.set("orientation", "squarish");
    url.searchParams.set("content_filter", "high");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${key}` },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ photos: [], error: txt }, { status: res.status });
    }

    const data = await res.json();

    const photos = (data.results ?? []).map((p: {
      id: string;
      urls: { regular: string; small: string; thumb: string };
      alt_description: string | null;
      user: { name: string };
      width: number;
      height: number;
    }) => ({
      id: p.id,
      thumb: p.urls.small,
      regular: p.urls.regular,
      alt: p.alt_description ?? "",
      author: p.user.name,
    }));

    return NextResponse.json({ photos, total: data.total_pages });
  } catch (err) {
    return NextResponse.json({ photos: [], error: String(err) }, { status: 500 });
  }
}
