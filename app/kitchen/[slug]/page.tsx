import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import KitchenClient from "@/components/KitchenClient";

export const revalidate = 0;

export default async function KitchenPage({ params }: { params: { slug: string } }) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: params.slug },
  });
  if (!restaurant) notFound();

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: restaurant.id,
      status: { in: ["PENDING", "PREPARING", "READY"] },
    },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <KitchenClient
      restaurant={{
        name: restaurant.name,
        slug: restaurant.slug,
        logoEmoji: restaurant.logoEmoji,
        primaryColor: restaurant.primaryColor,
      }}
      initialOrders={orders.map((o) => ({
        id: o.id,
        number: o.number,
        customerName: o.customerName,
        status: o.status as "PENDING" | "PREPARING" | "READY",
        total: o.total,
        note: o.note ?? undefined,
        createdAt: o.createdAt.toISOString(),
        items: o.items.map((i) => ({ name: i.name, quantity: i.quantity })),
      }))}
    />
  );
}
