import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MenuClient from "@/components/MenuClient";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const restaurant = await prisma.restaurant.findUnique({ where: { slug: params.slug } });
  if (!restaurant) return {};
  return { title: `${restaurant.logoEmoji} ${restaurant.name} — Commander` };
}

export default async function RestaurantPage({ params }: { params: { slug: string } }) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: params.slug },
    include: {
      categories: {
        orderBy: { position: "asc" },
        include: {
          menuItems: { where: { available: true }, orderBy: { name: "asc" } },
        },
      },
    },
  });

  if (!restaurant) notFound();

  return (
    <MenuClient
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
          description: item.description ?? undefined,
          price: item.price,
          emoji: item.emoji,
        })),
      }))}
    />
  );
}
