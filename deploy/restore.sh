#!/usr/bin/env bash
# Wiederherstellung einer Sicherung aus deploy/backup.sh.
# Aufruf: ./deploy/restore.sh backups/2026-11-02_030000.tar.gz
# Stoppt die API, ersetzt Datenbank, Uploads und PDFs im Volume, startet wieder. Fragt vorher nach.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(dirname "${SCRIPT_DIR}")}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-bodenschutz}"
VOLUME="${VOLUME:-${COMPOSE_PROJECT}_api_data}"

ARCHIVE="${1:-}"
if [[ -z "${ARCHIVE}" || ! -f "${ARCHIVE}" ]]; then
  echo "Aufruf: $0 <sicherung.tar.gz>" >&2
  echo "Vorhandene Sicherungen:" >&2
  ls -1 "${APP_DIR}/backups"/*.tar.gz 2>/dev/null >&2 || echo "  keine" >&2
  exit 1
fi
ARCHIVE="$(readlink -f "${ARCHIVE}")"

echo "ACHTUNG: Die aktuellen Daten (Datenbank, Uploads, PDFs) werden durch ${ARCHIVE} ersetzt."
read -r -p "Wirklich fortfahren? (ja/nein) " ANSWER
if [[ "${ANSWER}" != "ja" ]]; then
  echo "Abgebrochen."
  exit 0
fi

WORK="$(mktemp -d)"
trap 'rm -rf "${WORK}"' EXIT
tar -xzf "${ARCHIVE}" -C "${WORK}"
INNER="$(find "${WORK}" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
if [[ ! -f "${INNER}/app.db" ]]; then
  echo "Sicherung enthält keine app.db." >&2
  exit 1
fi

cd "${APP_DIR}"
echo "[restore] API anhalten"
docker compose stop api

echo "[restore] Sicherheitskopie des aktuellen Stands anlegen"
SAFE="${APP_DIR}/backups/vor-restore_$(date +%Y-%m-%d_%H%M%S).tar.gz"
docker run --rm -v "${VOLUME}:/data:ro" alpine:3.20 tar -czf - -C /data . > "${SAFE}" || true
echo "    ${SAFE}"

echo "[restore] Daten ins Volume schreiben"
docker run --rm \
  -v "${VOLUME}:/data" \
  -v "${INNER}:/restore:ro" \
  alpine:3.20 sh -c '
    rm -f /data/app.db /data/app.db-journal /data/app.db-wal /data/app.db-shm
    rm -rf /data/uploads /data/pdf
    mkdir -p /data/uploads /data/pdf
    cp /restore/app.db /data/app.db
    if [ -f /restore/dateien.tar.gz ]; then tar -xzf /restore/dateien.tar.gz -C /data; fi
    chown -R 1000:1000 /data'

echo "[restore] API starten"
docker compose start api
sleep 5
docker compose ps api
echo "[restore] fertig. Bitte Login in die Verwaltung und eine Anfrage prüfen."
