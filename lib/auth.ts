"use server";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "fallback-secret-key-32-characters!"
);

export async function createAdminToken(restaurantId: string) {
  const token = await new SignJWT({ restaurantId, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
  return token;
}

export async function verifyAdminToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.restaurantId as string;
  } catch {
    return null;
  }
}

export async function getAdminSession(slug: string): Promise<boolean> {
  const cookieStore = cookies();
  const token = cookieStore.get(`admin_${slug}`)?.value;
  if (!token) return false;
  const restaurantId = await verifyAdminToken(token);
  return !!restaurantId;
}
