import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SlideData } from "../../generate/route";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const post = await prisma.carouselPost.findUnique({
      where: { id },
      include: { restaurant: true },
    });
    if (!post) return NextResponse.json({ error: "Post introuvable" }, { status: 404 });
    if (!["composed", "delivered"].includes(post.status)) {
      return NextResponse.json({ error: "Post pas encore composé" }, { status: 400 });
    }

    const slides: SlideData[] = (() => {
      try { return JSON.parse(post.slides); } catch { return []; }
    })();

    return NextResponse.json({
      id: post.id,
      status: post.status,
      restaurantName: post.restaurant.name,
      address: post.restaurant.address,
      slides: slides.map(s => ({
        number: s.number,
        text: s.text,
        selectedImageUrl: s.selectedImageUrl,
        slideUrl: `/api/carousel/${id}/slide/${s.number}`,
      })),
      caption: post.caption,
      hashtags: (() => {
        try { return JSON.parse(post.hashtags ?? "[]"); } catch { return []; }
      })(),
      verificationNotes: (() => {
        try { return JSON.parse(post.verificationNotes ?? "{}"); } catch { return {}; }
      })(),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
