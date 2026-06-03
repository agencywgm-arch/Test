"use server";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "nightlife-paris-secret-key-32chars!!"
);

const COOKIE = "nightlife_session";

export async function createSession(promoteurId: string) {
  const token = await new SignJWT({ promoteurId, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret);

  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
  });
}

export async function destroySession() {
  cookies().delete(COOKIE);
}

export async function getSession() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.promoteurId as string;
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const id = await getSession();
  if (!id) throw new Error("Non autorisé");
  const promoteur = await prisma.promoteur.findUnique({ where: { id } });
  if (!promoteur) throw new Error("Compte introuvable");
  return promoteur;
}
