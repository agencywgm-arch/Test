"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSession, destroySession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const promoteur = await prisma.promoteur.findUnique({ where: { email } });
  if (!promoteur) return { error: "Email ou mot de passe incorrect" };
  const valid = await bcrypt.compare(password, promoteur.password);
  if (!valid) return { error: "Email ou mot de passe incorrect" };
  await createSession(promoteur.id);
  return { success: true };
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ─── Participants ─────────────────────────────────────────────────────────────

export async function updateParticipantStatut(
  id: string,
  statut: "EN_ATTENTE" | "ACCEPTEE" | "REFUSEE" | "INVITEE" | "PRESENTE"
) {
  await prisma.participant.update({ where: { id }, data: { statut } });
  revalidatePath("/participants");
  revalidatePath("/dashboard");
}

export async function createParticipant(data: {
  prenom: string;
  age: number;
  instagram: string;
  telephone?: string;
  email?: string;
  notes?: string;
}) {
  await prisma.participant.create({ data });
  revalidatePath("/participants");
  revalidatePath("/dashboard");
}

export async function deleteParticipant(id: string) {
  await prisma.participant.delete({ where: { id } });
  revalidatePath("/participants");
  revalidatePath("/dashboard");
}

export async function assignParticipantEvenement(participantId: string, evenementId: string | null) {
  await prisma.participant.update({ where: { id: participantId }, data: { evenementId } });
  revalidatePath("/participants");
  revalidatePath("/evenements");
  revalidatePath("/dashboard");
}

// ─── Événements ──────────────────────────────────────────────────────────────

export async function createEvenement(data: {
  nom: string;
  date: string;
  lieu: string;
  adresse: string;
  heureDebut: string;
  heureFin: string;
  dressCode?: string;
  maxParticipants: number;
}) {
  await prisma.evenement.create({
    data: { ...data, date: new Date(data.date) },
  });
  revalidatePath("/evenements");
  revalidatePath("/dashboard");
}

export async function updateEvenementStatut(
  id: string,
  statut: "PLANIFIE" | "CONFIRME" | "TERMINE" | "ANNULE"
) {
  await prisma.evenement.update({ where: { id }, data: { statut } });
  revalidatePath("/evenements");
  revalidatePath("/dashboard");
}

export async function deleteEvenement(id: string) {
  await prisma.evenement.delete({ where: { id } });
  revalidatePath("/evenements");
  revalidatePath("/dashboard");
}

// ─── Contenu ──────────────────────────────────────────────────────────────────

export async function updateContenuStatut(
  id: string,
  statut: "EN_ATTENTE" | "VALIDE" | "REFUSE" | "PUBLIE"
) {
  await prisma.contenu.update({
    where: { id },
    data: {
      statut,
      publishedAt: statut === "PUBLIE" ? new Date() : undefined,
    },
  });
  revalidatePath("/contenu");
  revalidatePath("/dashboard");
}

export async function createContenu(data: {
  restaurant: string;
  scoreGlobal: number;
  scoreViral: number;
  scoreLuxe: number;
  slides: string;
  caption?: string;
  hashtags?: string;
}) {
  await prisma.contenu.create({ data });
  revalidatePath("/contenu");
  revalidatePath("/dashboard");
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export async function createStaff(data: {
  prenom: string;
  nom: string;
  role: string;
  whatsapp?: string;
  email?: string;
}) {
  await prisma.staff.create({ data });
  revalidatePath("/staff");
  revalidatePath("/dashboard");
}

export async function updateStaffConfirmation(
  staffId: string,
  evenementId: string,
  statut: "EN_ATTENTE" | "OUI" | "NON"
) {
  await prisma.staffEvenement.upsert({
    where: { staffId_evenementId: { staffId, evenementId } },
    update: { statut },
    create: { staffId, evenementId, statut },
  });
  revalidatePath("/staff");
  revalidatePath("/dashboard");
}

export async function deleteStaff(id: string) {
  await prisma.staff.delete({ where: { id } });
  revalidatePath("/staff");
  revalidatePath("/dashboard");
}

// ─── Agents IA ───────────────────────────────────────────────────────────────

export async function saveAgentConfig(
  agentId: string,
  active: boolean,
  values: Record<string, string>
) {
  await prisma.agentConfig.upsert({
    where: { agentId },
    update: { active, values: JSON.stringify(values) },
    create: { agentId, active, values: JSON.stringify(values) },
  });
  revalidatePath("/staff");
  revalidatePath("/evenements");
  return { success: true };
}

export async function testAgentConfig(
  agentId: string,
  values: Record<string, string>
): Promise<{ ok: boolean; message: string }> {
  if (agentId === "agent-staff-whatsapp") {
    const token = values.wa_business_token?.trim();
    const phoneId = values.wa_phone_number_id?.trim();
    if (!token || !phoneId) {
      return { ok: false, message: "Renseigne le token WhatsApp Business et le Phone Number ID avant de tester." };
    }
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(phoneId)}?access_token=${encodeURIComponent(token)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (res.ok && data.id) {
        return { ok: true, message: `Connexion WhatsApp Business OK — numéro vérifié : ${data.display_phone_number ?? data.id}` };
      }
      return { ok: false, message: `Meta a refusé les identifiants : ${data.error?.message ?? `HTTP ${res.status}`}` };
    } catch {
      return { ok: false, message: "Impossible de joindre l'API Meta. Vérifie la connexion réseau du serveur." };
    }
  }

  if (agentId === "agent-dm") {
    const token = values.manychat_token?.trim();
    if (!token) {
      return { ok: false, message: "Renseigne le token ManyChat avant de tester." };
    }
    try {
      const res = await fetch("https://api.manychat.com/fb/page/getInfo", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        return { ok: true, message: `Connexion ManyChat OK — page : ${data.data?.name ?? "vérifiée"}` };
      }
      return { ok: false, message: `ManyChat a refusé le token : ${data.message ?? `HTTP ${res.status}`}` };
    } catch {
      return { ok: false, message: "Impossible de joindre l'API ManyChat. Vérifie la connexion réseau du serveur." };
    }
  }

  // Agents sans clé externe : on valide juste que les champs sont remplis
  const empty = Object.entries(values).filter(([, v]) => !String(v ?? "").trim());
  if (empty.length > 0) {
    return { ok: false, message: `Champs manquants : ${empty.map(([k]) => k).join(", ")}` };
  }
  return { ok: true, message: "Configuration complète — l'agent est prêt à être activé." };
}
