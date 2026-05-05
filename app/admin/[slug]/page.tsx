import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import AdminDashboard from "@/components/AdminDashboard";

export default async function AdminPage({ params }: { params: { slug: string } }) {
  const isLoggedIn = await getAdminSession(params.slug);
  if (!isLoggedIn) redirect(`/admin/${params.slug}/login`);

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: params.slug },
    include: {
      categories: {
        orderBy: { position: "asc" },
        include: { menuItems: { orderBy: { name: "asc" } } },
      },
    },
  });
  if (!restaurant) notFound();

  const recentOrders = await prisma.order.findMany({
    where: { restaurantId: restaurant.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayOrders = await prisma.order.count({
    where: { restaurantId: restaurant.id, createdAt: { gte: todayStart } },
  });
  const todayRevenue = await prisma.order.aggregate({
    where: { restaurantId: restaurant.id, createdAt: { gte: todayStart } },
    _sum: { total: true },
  });

  return (
    <AdminDashboard
      restaurant={{
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        logoEmoji: restaurant.logoEmoji,
        primaryColor: restaurant.primaryColor,
      }}
      categories={restaurant.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        menuItems: cat.menuItems.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description ?? "",
          price: item.price,
          emoji: item.emoji,
          available: item.available,
        })),
      }))}
      stats={{
        todayOrders,
        todayRevenue: todayRevenue._sum.total ?? 0,
        activeOrders: recentOrders.filter((o) => ["PENDING", "PREPARING", "READY"].includes(o.status)).length,
      }}
      recentOrders={recentOrders.map((o) => ({
        id: o.id,
        number: o.number,
        customerName: o.customerName,
        status: o.status,
        total: o.total,
        createdAt: o.createdAt.toISOString(),
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      }))}
    />
  );
}
