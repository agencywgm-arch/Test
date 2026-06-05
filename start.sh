#!/bin/sh
export DATABASE_URL="${DATABASE_URL:-file:./dev.db}"
echo "DATABASE_URL = $DATABASE_URL"

echo "=== Sync schéma Prisma ==="
npx prisma db push --accept-data-loss

echo "=== Démarrage Next.js (seed automatique au boot) ==="
exec npx next start
