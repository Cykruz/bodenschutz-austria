# syntax=docker/dockerfile:1.7
# Bodenschutz Austria – Website (Next.js, output: standalone)
# Build-Kontext ist das Repo-Root (docker compose: context: ., dockerfile: apps/web/Dockerfile).

# ---------- Stufe 1: Abhängigkeiten ----------
FROM node:24-alpine AS deps
WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- Stufe 2: Build ----------
FROM node:24-alpine AS build
WORKDIR /app/apps/web
# Diese Werte werden beim Build eingebacken (Rewrite-Ziel und öffentliche Adressen)
ARG API_INTERNAL_URL=http://api:4000
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_ANDROID_APK_URL=
ARG NEXT_PUBLIC_MOCK_API=false
ENV API_INTERNAL_URL=$API_INTERNAL_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_ANDROID_APK_URL=$NEXT_PUBLIC_ANDROID_APK_URL \
    NEXT_PUBLIC_MOCK_API=$NEXT_PUBLIC_MOCK_API \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY apps/web/ ./
# next/font/google lädt die Schriften beim Build (Netz nötig) und liefert sie danach selbst aus
RUN npm run build

# ---------- Stufe 3: Laufzeit ----------
FROM node:24-alpine AS runtime
RUN apk add --no-cache curl tini
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# Standalone-Ausgabe enthält server.js und die nötigen node_modules; static und public müssen daneben liegen
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS -o /dev/null http://127.0.0.1:3000/ || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]
