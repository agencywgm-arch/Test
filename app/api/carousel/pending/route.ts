import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const posts = await prisma.carouselPost.findMany({
      where: { status: { in: ["awaiting_validation", "validated", "composed", "delivered"] } },
      include: { restaurant: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      posts: posts.map(p => ({
        id: p.id,
        status: p.status,
        restaurantName: p.restaurant.name,
        address: p.restaurant.address,
        createdAt: p.createdAt,
        slides: (() => {
          try { return JSON.parse(p.slides); } catch { return []; }
        })(),
        caption: p.caption,
        hashtags: (() => {
          try { return JSON.parse(p.hashtags ?? "[]"); } catch { return []; }
        })(),
        verificationNotes: (() => {
          try { return JSON.parse(p.verificationNotes ?? "{}"); } catch { return {}; }
        })(),
        finalAssets: (() => {
          try { return JSON.parse(p.finalAssets ?? "[]"); } catch { return []; }
        })(),
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
