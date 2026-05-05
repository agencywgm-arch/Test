"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createAdminToken, verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function loginAdmin(slug: string, password: string) {
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return { error: "Restaurant introuvable" };

  const valid = await bcrypt.compare(password, restaurant.password);
  if (!valid) return { error: "Mot de passe incorrect" };

  const token = await createAdminToken(restaurant.id);
  cookies().set(`admin_${slug}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return { success: true };
}

export async function logoutAdmin(slug: string) {
  cookies().delete(`admin_${slug}`);
}

async function requireAdmin(slug: string) {
  const token = cookies().get(`admin_${slug}`)?.value;
  if (!token) throw new Error("Non autorisé");
  const restaurantId = await verifyAdminToken(token);
  if (!restaurantId) throw new Error("Session expirée");
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: restaurantId, slug },
  });
  if (!restaurant) throw new Error("Non autorisé");
  return restaurant;
}

// ─── Menu Management ─────────────────────────────────────────────────────────

export async function createCategory(slug: string, name: string) {
  const restaurant = await requireAdmin(slug);
  const max = await prisma.category.findFirst({
    where: { restaurantId: restaurant.id },
    orderBy: { position: "desc" },
  });
  const category = await prisma.category.create({
    data: { name, restaurantId: restaurant.id, position: (max?.position ?? -1) + 1 },
  });
  revalidatePath(`/${slug}`);
  revalidatePath(`/admin/${slug}`);
  return category;
}

export async function deleteCategory(slug: string, categoryId: string) {
  await requireAdmin(slug);
  await prisma.category.delete({ where: { id: categoryId } });
  revalidatePath(`/${slug}`);
  revalidatePath(`/admin/${slug}`);
}

export async function createMenuItem(
  slug: string,
  data: { name: string; description?: string; price: number; emoji: string; categoryId: string }
) {
  await requireAdmin(slug);
  const item = await prisma.menuItem.create({ data });
  revalidatePath(`/${slug}`);
  revalidatePath(`/admin/${slug}`);
  return item;
}

export async function updateMenuItem(
  slug: string,
  id: string,
  data: Partial<{ name: string; description: string; price: number; emoji: string; available: boolean }>
) {
  await requireAdmin(slug);
  const item = await prisma.menuItem.update({ where: { id }, data });
  revalidatePath(`/${slug}`);
  revalidatePath(`/admin/${slug}`);
  return item;
}

export async function deleteMenuItem(slug: string, id: string) {
  await requireAdmin(slug);
  await prisma.menuItem.delete({ where: { id } });
  revalidatePath(`/${slug}`);
  revalidatePath(`/admin/${slug}`);
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function createOrder(
  slug: string,
  customerName: string,
  items: { menuItemId: string; quantity: number }[],
  note?: string
) {
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) throw new Error("Restaurant introuvable");

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map((i) => i.menuItemId) }, available: true },
  });

  if (menuItems.length !== items.length) throw new Error("Article indisponible");

  const lastOrder = await prisma.order.findFirst({
    where: { restaurantId: restaurant.id },
    orderBy: { number: "desc" },
  });
  const number = (lastOrder?.number ?? 0) + 1;

  const total = items.reduce((sum, item) => {
    const mi = menuItems.find((m) => m.id === item.menuItemId)!;
    return sum + mi.price * item.quantity;
  }, 0);

  const order = await prisma.order.create({
    data: {
      number,
      customerName,
      total,
      note: note ?? null,
      restaurantId: restaurant.id,
      items: {
        create: items.map((item) => {
          const mi = menuItems.find((m) => m.id === item.menuItemId)!;
          return { quantity: item.quantity, price: mi.price, name: mi.name, menuItemId: mi.id };
        }),
      },
    },
    include: { items: true },
  });

  revalidatePath(`/kitchen/${slug}`);
  return order;
}

export async function updateOrderStatus(
  slug: string,
  orderId: string,
  status: "PENDING" | "PREPARING" | "READY" | "DONE"
) {
  await requireAdmin(slug);
  const order = await prisma.order.update({ where: { id: orderId }, data: { status } });
  revalidatePath(`/kitchen/${slug}`);
  revalidatePath(`/${slug}/order/${orderId}`);
  return order;
}

export async function updateRestaurantSettings(
  slug: string,
  data: Partial<{ name: string; logoEmoji: string; primaryColor: string; password: string }>
) {
  const restaurant = await requireAdmin(slug);
  const updateData: Record<string, string> = {};
  if (data.name) updateData.name = data.name;
  if (data.logoEmoji) updateData.logoEmoji = data.logoEmoji;
  if (data.primaryColor) updateData.primaryColor = data.primaryColor;
  if (data.password) updateData.password = await bcrypt.hash(data.password, 10);

  await prisma.restaurant.update({ where: { id: restaurant.id }, data: updateData });
  revalidatePath(`/${slug}`);
  revalidatePath(`/admin/${slug}`);
}
