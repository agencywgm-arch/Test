"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import {
  analyzeProspect,
  generateOutreachEmail,
  generateFollowUpEmail,
} from "./ai-agent";

export type ProspectStatus =
  | "NEW"
  | "CONTACTED"
  | "INTERESTED"
  | "PROPOSAL"
  | "WON"
  | "LOST";

export async function createProspect(formData: FormData) {
  const businessName = formData.get("businessName") as string;
  const contactName = formData.get("contactName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const website = formData.get("website") as string;
  const businessType = formData.get("businessType") as string;
  const city = formData.get("city") as string;
  const country = (formData.get("country") as string) || "France";
  const notes = formData.get("notes") as string;

  const prospect = await prisma.prospect.create({
    data: {
      businessName,
      contactName: contactName || null,
      email: email || null,
      phone: phone || null,
      website: website || null,
      businessType,
      city: city || null,
      country,
      notes: notes || null,
    },
  });

  revalidatePath("/prospecting");
  return prospect;
}

export async function updateProspectStatus(
  prospectId: string,
  status: ProspectStatus
) {
  await prisma.prospect.update({
    where: { id: prospectId },
    data: { status },
  });
  revalidatePath("/prospecting");
}

export async function updateProspectNotes(
  prospectId: string,
  notes: string
) {
  await prisma.prospect.update({
    where: { id: prospectId },
    data: { notes },
  });
  revalidatePath(`/prospecting/${prospectId}`);
}

export async function deleteProspect(prospectId: string) {
  await prisma.prospect.delete({ where: { id: prospectId } });
  revalidatePath("/prospecting");
}

export async function runAIAnalysis(prospectId: string) {
  const prospect = await prisma.prospect.findUniqueOrThrow({
    where: { id: prospectId },
  });

  const analysis = await analyzeProspect(
    prospect.businessName,
    prospect.businessType,
    prospect.city || "",
    prospect.website,
    prospect.notes
  );

  await prisma.prospect.update({
    where: { id: prospectId },
    data: {
      score: analysis.score,
      aiAnalysis: JSON.stringify(analysis),
    },
  });

  revalidatePath(`/prospecting/${prospectId}`);
  return analysis;
}

export async function generateAndSaveEmail(prospectId: string) {
  const prospect = await prisma.prospect.findUniqueOrThrow({
    where: { id: prospectId },
  });

  if (!prospect.aiAnalysis) {
    throw new Error("Analyse IA requise avant la génération d'email");
  }

  const analysis = JSON.parse(prospect.aiAnalysis);

  const email = await generateOutreachEmail(
    prospect.businessName,
    prospect.businessType,
    prospect.city || "",
    prospect.contactName,
    analysis,
    prospect.website
  );

  const outreach = await prisma.outreach.create({
    data: {
      prospectId,
      type: "EMAIL",
      subject: email.subject,
      content: email.body,
    },
  });

  revalidatePath(`/prospecting/${prospectId}`);
  return outreach;
}

export async function generateAndSaveFollowUp(
  prospectId: string,
  originalOutreachId: string
) {
  const prospect = await prisma.prospect.findUniqueOrThrow({
    where: { id: prospectId },
  });
  const original = await prisma.outreach.findUniqueOrThrow({
    where: { id: originalOutreachId },
  });

  const daysSince = original.sentAt
    ? Math.floor(
        (Date.now() - original.sentAt.getTime()) / (1000 * 60 * 60 * 24)
      )
    : 7;

  const email = await generateFollowUpEmail(
    prospect.businessName,
    prospect.contactName,
    original.content,
    daysSince
  );

  const outreach = await prisma.outreach.create({
    data: {
      prospectId,
      type: "EMAIL",
      subject: email.subject,
      content: email.body,
    },
  });

  revalidatePath(`/prospecting/${prospectId}`);
  return outreach;
}

export async function markOutreachSent(outreachId: string, prospectId: string) {
  await prisma.outreach.update({
    where: { id: outreachId },
    data: { sentAt: new Date() },
  });
  await prisma.prospect.update({
    where: { id: prospectId },
    data: { status: "CONTACTED" },
  });
  revalidatePath(`/prospecting/${prospectId}`);
  revalidatePath("/prospecting");
}

export async function getProspects() {
  return prisma.prospect.findMany({
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    include: { outreaches: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
}

export async function getProspect(id: string) {
  return prisma.prospect.findUniqueOrThrow({
    where: { id },
    include: { outreaches: { orderBy: { createdAt: "desc" } } },
  });
}

export async function getProspectingStats() {
  const [total, won, contacted, withScore] = await Promise.all([
    prisma.prospect.count(),
    prisma.prospect.count({ where: { status: "WON" } }),
    prisma.prospect.count({
      where: { status: { in: ["CONTACTED", "INTERESTED", "PROPOSAL", "WON"] } },
    }),
    prisma.prospect.aggregate({
      where: { score: { not: null } },
      _avg: { score: true },
      _count: true,
    }),
  ]);

  return {
    total,
    won,
    contacted,
    conversionRate: total > 0 ? Math.round((won / total) * 100) : 0,
    avgScore: withScore._avg.score
      ? Math.round(withScore._avg.score)
      : null,
    analyzed: withScore._count,
  };
}
