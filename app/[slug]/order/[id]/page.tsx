import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OrderTracker from "@/components/OrderTracker";

export const revalidate = 0;

export default async function OrderPage({ params }: { params: { slug: string; id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      restaurant: true,
    },
  });

  if (!order || order.restaurant.slug !== params.slug) notFound();

  return (
    <OrderTracker
      order={{
        id: order.id,
        number: order.number,
        customerName: order.customerName,
        status: order.status as "PENDING" | "PREPARING" | "READY" | "DONE",
        total: order.total,
        note: order.note ?? undefined,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
      }}
      restaurant={{
        name: order.restaurant.name,
        slug: order.restaurant.slug,
        logoEmoji: order.restaurant.logoEmoji,
        primaryColor: order.restaurant.primaryColor,
      }}
    />
  );
}
