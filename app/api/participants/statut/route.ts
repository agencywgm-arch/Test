import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { id, statut } = await req.json();
    if (!id || !statut) return NextResponse.json({ error: "Missing params" }, { status: 400 });
    await prisma.participant.update({ where: { id }, data: { statut } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
