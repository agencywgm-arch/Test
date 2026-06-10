import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SlideData } from "../../generate/route";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { slideSelections } = await req.json() as {
      slideSelections: Record<number, { url: string; thumbUrl: string }>;
    };

    const post = await prisma.carouselPost.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ error: "Post introuvable" }, { status: 404 });
    if (post.status === "delivered") {
      return NextResponse.json({ error: "Ce post est déjà livré" }, { status: 400 });
    }

    const slides: SlideData[] = (() => {
      try { return JSON.parse(post.slides); } catch { return []; }
    })();

    // Validate all slides have a selection
    const unselected = slides.filter(s => !slideSelections[s.number]);
    if (unselected.length > 0) {
      return NextResponse.json(
        { error: `Slides sans image sélectionnée : ${unselected.map(s => s.number).join(", ")}` },
        { status: 400 }
      );
    }

    // Apply selections
    const updatedSlides = slides.map(s => ({
      ...s,
      selectedImageUrl: slideSelections[s.number]?.url ?? null,
      selectedThumbUrl: slideSelections[s.number]?.thumbUrl ?? null,
    }));

    await prisma.carouselPost.update({
      where: { id },
      data: {
        slides: JSON.stringify(updatedSlides),
        status: "validated",
      },
    });

    await prisma.restaurantHistory.update({
      where: { id: post.restaurantId },
      data: { status: "validated" },
    });

    return NextResponse.json({ success: true, status: "validated" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
