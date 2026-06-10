import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const post = await prisma.carouselPost.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ error: "Post introuvable" }, { status: 404 });

    await prisma.carouselPost.update({ where: { id }, data: { status: "draft" } });
    await prisma.restaurantHistory.update({
      where: { id: post.restaurantId },
      data: { status: "rejected" },
    });

    return NextResponse.json({ success: true, status: "rejected" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
