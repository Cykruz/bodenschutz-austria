#!/usr/bin/env bash
# Update auf den aktuellen Stand: Code holen, Images bauen, Container neu starten, Schema anwenden, Smoke-Test.
# Aufruf (als Betriebsnutzer): ./deploy/update.sh [branch]
# Mit USE_REGISTRY=1 werden statt des lokalen Builds die Images aus API_IMAGE/WEB_IMAGE (.env) gezogen.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(dirname "${SCRIPT_DIR}")}"
BRANCH="${1:-main}"
cd "${APP_DIR}"

echo "[update] Sicherung vor dem Update"
"${SCRIPT_DIR}/backup.sh" || echo "[update] Warnung: Sicherung fehlgeschlagen, Update läuft trotzdem weiter."

echo "[update] Code holen (${BRANCH})"
git fetch --depth 1 origin "${BRANCH}"
git checkout -q "${BRANCH}"
git reset -q --hard "origin/${BRANCH}"
git log --oneline -1

if [[ "${USE_REGISTRY:-0}" == "1" ]]; then
  echo "[update] Images aus der Registry ziehen"
  docker compose pull api web
  docker compose up -d
else
  echo "[update] Images bauen und Container neu starten"
  docker compose build --pull api web
  docker compose up -d
fi

echo "[update] Datenbankschema anwenden"
# Der Entrypoint macht das auch beim Start; hier noch einmal explizit, damit Fehler sichtbar sind.
for _ in $(seq 1 30); do
  if docker compose exec -T api npx prisma db push --skip-generate >/dev/null 2>&1; then
    echo "    Schema aktuell"
    break
  fi
  sleep 2
done

echo "[update] Smoke-Test"
DOMAIN="$(grep -E '^DOMAIN=' .env | cut -d= -f2- | tr -d '"' || true)"
OK=0
for _ in $(seq 1 30); do
  if docker compose exec -T api curl -fsS http://127.0.0.1:4000/api/health >/dev/null 2>&1; then OK=1; break; fi
  sleep 2
done
if [[ "${OK}" -ne 1 ]]; then
  echo "[update] FEHLER: API antwortet nicht auf /api/health. Logs: docker compose logs api" >&2
  exit 1
fi
echo "    API intern: ok"
if [[ -n "${DOMAIN}" ]]; then
  if curl -fsS --max-time 15 "https://${DOMAIN}/api/health" >/dev/null; then
    echo "    https://${DOMAIN}/api/health: ok"
  else
    echo "    Warnung: https://${DOMAIN}/api/health nicht erreichbar (DNS/Zertifikat/Firewall prüfen)."
  fi
fi

echo "[update] Alte Images aufräumen"
docker image prune -f >/dev/null
docker compose ps
echo "[update] fertig"
