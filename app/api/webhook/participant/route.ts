import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const participant = await prisma.participant.create({
      data: {
        prenom: body.first_name || body.prenom || "Inconnu",
        age: parseInt(body.age || "0", 10),
        instagram: body.instagram || body.custom_instagram || "",
        telephone: body.phone || body.custom_phone || null,
        email: body.email || body.custom_email || null,
        manychatId: body.subscriber_id || null,
        source: "Instagram DM",
        statut: "EN_ATTENTE",
      },
    });

    return NextResponse.json({ success: true, id: participant.id });
  } catch (err) {
    console.error("Webhook participant error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
