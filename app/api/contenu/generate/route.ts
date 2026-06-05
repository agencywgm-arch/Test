import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const { restaurant, slides, caption, hashtags, scoreGlobal, scoreViral, scoreLuxe } = await req.json();
    if (!restaurant || !slides) return NextResponse.json({ error: "Missing params" }, { status: 400 });
    const contenu = await prisma.contenu.create({
      data: {
        restaurant,
        slides: JSON.stringify(slides),
        caption: caption || "",
        hashtags: hashtags || "#nightlifeparis #paris #soiree",
        scoreGlobal: scoreGlobal || 8.0,
        scoreViral: scoreViral || 8.0,
        scoreLuxe: scoreLuxe || 8.0,
        statut: "EN_ATTENTE",
      },
    });
    revalidatePath("/contenu");
    revalidatePath("/dashboard");
    return NextResponse.json({ ok: true, id: contenu.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
