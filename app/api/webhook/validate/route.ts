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
    const { type, id, action } = body;

    if (type === "participant") {
      const statut = action === "accepter" ? "ACCEPTEE" : "REFUSEE";
      await prisma.participant.update({ where: { id }, data: { statut } });
    } else if (type === "contenu") {
      const statut = action === "valider" ? "VALIDE" : "REFUSE";
      await prisma.contenu.update({
        where: { id },
        data: { statut, publishedAt: statut === "VALIDE" ? new Date() : undefined },
      });
    } else if (type === "staff") {
      const { staffId, evenementId } = body;
      const statut = action === "oui" ? "OUI" : "NON";
      await prisma.staffEvenement.upsert({
        where: { staffId_evenementId: { staffId, evenementId } },
        update: { statut },
        create: { staffId, evenementId, statut },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook validate error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
