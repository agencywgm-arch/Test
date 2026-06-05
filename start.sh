#!/bin/sh
set -e

# Valeur par défaut si DATABASE_URL n'est pas défini
export DATABASE_URL="${DATABASE_URL:-file:./dev.db}"
echo "DATABASE_URL = $DATABASE_URL"

echo ""
echo "=== [1/3] Sync schéma Prisma ==="
npx prisma db push --accept-data-loss
echo "Schéma OK"

echo ""
echo "=== [2/3] Seed données démo ==="
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
echo "Seed OK"

echo ""
echo "=== [3/3] Démarrage Next.js ==="
exec npx next start
