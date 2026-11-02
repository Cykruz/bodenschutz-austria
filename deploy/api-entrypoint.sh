#!/bin/sh
# Startskript des API-Containers: Datenverzeichnisse anlegen, Schema anwenden, Seed (idempotent), dann Server starten.
set -eu

cd /app/apps/api
mkdir -p data/uploads data/pdf

echo "[entrypoint] Datenbankschema anwenden (prisma db push)"
npx prisma db push --skip-generate --accept-data-loss=false >/dev/null 2>&1 || npx prisma db push --skip-generate

echo "[entrypoint] Stammdaten prüfen (Seed ist idempotent, überschreibt nichts)"
npx tsx prisma/seed.ts

echo "[entrypoint] Server starten"
exec "$@"
