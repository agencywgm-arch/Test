#!/bin/sh
set -e

export DATABASE_URL="${DATABASE_URL:-file:./dev.db}"
echo "DATABASE_URL = $DATABASE_URL"

echo "=== Sync schema Prisma ==="
npx prisma db push

echo "=== Demarrage Next.js ==="
exec npx next start
