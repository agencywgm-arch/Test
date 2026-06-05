#!/bin/sh
set -e

echo "DATABASE_URL = $DATABASE_URL"

echo "=== Sync schéma Prisma ==="
npx prisma db push

echo "=== Démarrage Next.js (seed automatique au boot) ==="
exec npx next start
