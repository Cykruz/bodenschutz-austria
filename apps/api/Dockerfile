# syntax=docker/dockerfile:1.7
# Bodenschutz Austria – API (Fastify + Prisma/SQLite)
# Build-Kontext ist das Repo-Root (docker compose: context: ., dockerfile: apps/api/Dockerfile),
# weil apps/api die Regel-Engine als file:../../packages/rules einbindet.

# ---------- Stufe 1: Regel-Engine bauen ----------
FROM node:24-alpine AS rules
WORKDIR /app/packages/rules
COPY packages/rules/package.json packages/rules/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY packages/rules/ ./
RUN npm run build && npm prune --omit=dev

# ---------- Stufe 2: API bauen ----------
FROM node:24-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=rules /app/packages/rules /app/packages/rules
WORKDIR /app/apps/api
COPY apps/api/package.json apps/api/package-lock.json ./
COPY apps/api/prisma ./prisma
# postinstall führt "prisma generate" aus, dafür muss das Schema schon da sein
RUN npm ci --no-audit --no-fund
COPY apps/api/ ./
RUN npm run build

# ---------- Stufe 3: Laufzeit ----------
# Entscheidung: Die Laufzeit behält die vollständigen node_modules (inkl. prisma CLI und tsx),
# weil der Entrypoint beim Start "prisma db push" und den TypeScript-Seed ausführt. Das kostet
# einige MB Image-Größe, spart aber einen zweiten Build-Schritt für den Seed und hält den
# Betrieb einfach (Schema-Update bei jedem Start, idempotenter Seed).
FROM node:24-alpine AS runtime
RUN apk add --no-cache openssl curl tini
ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=4000 \
    DATABASE_URL=file:/app/apps/api/data/app.db
WORKDIR /app
COPY --from=rules /app/packages/rules/package.json /app/packages/rules/package.json
COPY --from=rules /app/packages/rules/dist /app/packages/rules/dist
COPY --from=build /app/apps/api/package.json /app/apps/api/package.json
COPY --from=build /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=build /app/apps/api/prisma /app/apps/api/prisma
COPY --from=build /app/apps/api/dist /app/apps/api/dist
COPY deploy/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh \
    && mkdir -p /app/apps/api/data/uploads /app/apps/api/data/pdf \
    && chown -R node:node /app/apps/api/data
WORKDIR /app/apps/api
# Daten (SQLite, Uploads, PDFs) liegen im Volume
VOLUME ["/app/apps/api/data"]
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:4000/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/api-entrypoint.sh"]
CMD ["npm", "run", "start"]
