import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123", 10);

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "burger-palace" },
    update: {},
    create: {
      name: "Burger Palace",
      slug: "burger-palace",
      password,
      logoEmoji: "🍔",
      primaryColor: "#ef4444",
      categories: {
        create: [
          {
            name: "Burgers",
            position: 0,
            menuItems: {
              create: [
                { name: "Classic Burger", description: "Steak haché, salade, tomate, oignons", price: 8.9, emoji: "🍔", available: true },
                { name: "Double Cheese", description: "Double steak, double cheddar fondu", price: 11.5, emoji: "🧀", available: true },
                { name: "Spicy Chicken", description: "Filet de poulet pané épicé, mayo sriracha", price: 10.2, emoji: "🌶️", available: true },
                { name: "Veggie Burger", description: "Steak de légumes, avocat, pesto", price: 9.5, emoji: "🥗", available: true },
              ],
            },
          },
          {
            name: "Accompagnements",
            position: 1,
            menuItems: {
              create: [
                { name: "Frites Maison", description: "Fraîches et croustillantes", price: 3.5, emoji: "🍟", available: true },
                { name: "Onion Rings", description: "Rondelles d'oignon panées", price: 4.0, emoji: "🧅", available: true },
                { name: "Nuggets x6", description: "Poulet croustillant, sauce au choix", price: 5.5, emoji: "🍗", available: true },
                { name: "Salade César", description: "Romaine, parmesan, croûtons", price: 6.0, emoji: "🥙", available: false },
              ],
            },
          },
          {
            name: "Boissons",
            position: 2,
            menuItems: {
              create: [
                { name: "Coca-Cola 33cl", price: 2.5, emoji: "🥤", available: true },
                { name: "Eau minérale", price: 1.8, emoji: "💧", available: true },
                { name: "Milkshake", description: "Vanille, chocolat ou fraise", price: 4.5, emoji: "🥛", available: true },
                { name: "Jus d'orange frais", price: 3.5, emoji: "🍊", available: true },
              ],
            },
          },
          {
            name: "Desserts",
            position: 3,
            menuItems: {
              create: [
                { name: "Sundae Chocolat", price: 3.0, emoji: "🍦", available: true },
                { name: "Brownie", description: "Chaud, servi avec glace vanille", price: 4.5, emoji: "🍫", available: true },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`✅ Restaurant de démo créé : ${restaurant.name}`);
  console.log(`   URL menu    : http://localhost:3000/${restaurant.slug}`);
  console.log(`   URL cuisine : http://localhost:3000/kitchen/${restaurant.slug}`);
  console.log(`   URL admin   : http://localhost:3000/admin/${restaurant.slug}`);
  console.log(`   Mot de passe admin : admin123`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
