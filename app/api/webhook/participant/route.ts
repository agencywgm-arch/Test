import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Sécurité optionnelle : si WEBHOOK_SECRET est défini, le requérant doit le
// fournir (header x-webhook-secret ou ?secret=). Sinon accès libre (plug-and-play).
function checkSecret(req: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true;
  const provided =
    req.headers.get("x-webhook-secret") ?? req.nextUrl.searchParams.get("secret");
  return provided === secret;
}

export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "Secret invalide" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const age = parseInt(body.age ?? "0", 10);

    const participant = await prisma.participant.create({
      data: {
        prenom: body.first_name || body.prenom || "Inconnu",
        age: Number.isFinite(age) ? age : 0,
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
