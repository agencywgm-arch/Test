import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SlideData } from "../../generate/route";

// Composition rule: ALL slides must have a selected image before composing.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const post = await prisma.carouselPost.findUnique({
      where: { id },
      include: { restaurant: true },
    });
    if (!post) return NextResponse.json({ error: "Post introuvable" }, { status: 404 });

    // RÈGLE NON NÉGOCIABLE : composition impossible sans validation humaine
    if (post.status !== "validated") {
      return NextResponse.json(
        { error: "Composition refusée : le post doit être validé par un humain avant composition.", status: post.status },
        { status: 403 }
      );
    }

    const slides: SlideData[] = (() => {
      try { return JSON.parse(post.slides); } catch { return []; }
    })();

    const missing = slides.filter(s => !s.selectedImageUrl);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Slides sans image sélectionnée : ${missing.map(s => s.number).join(", ")}` },
        { status: 400 }
      );
    }

    // Mark as composed — slide PNG URLs are generated on-demand via /api/carousel/:id/slide/:num
    const slideAssets = slides.map(s => ({
      slideNum: s.number,
      url: `/api/carousel/${id}/slide/${s.number}`,
    }));

    await prisma.carouselPost.update({
      where: { id },
      data: {
        status: "composed",
        finalAssets: JSON.stringify(slideAssets),
      },
    });

    await prisma.restaurantHistory.update({
      where: { id: post.restaurantId },
      data: { status: "published" },
    });

    return NextResponse.json({
      success: true,
      status: "composed",
      restaurantName: post.restaurant.name,
      slideAssets,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
