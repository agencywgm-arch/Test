export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prisma } = await import("./lib/prisma");
    // Crée les tables si elles n'existent pas (SQLite)
    try {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (id TEXT PRIMARY KEY)`);
    } catch {}
    const { seedIfEmpty } = await import("./lib/seed-demo");
    await seedIfEmpty();
  }
}
