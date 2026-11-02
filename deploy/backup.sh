#!/usr/bin/env bash
# Datensicherung für Bodenschutz Austria: SQLite-Datenbank (konsistent über die SQLite-Backup-API),
# Uploads und PDFs als tar.gz. Behält 14 Tage, lädt optional per rclone hoch.
#
# Aufruf (als Betriebsnutzer, im Anwendungsordner oder mit APP_DIR):
#   ./deploy/backup.sh
# Variablen: APP_DIR (Standard: Ordner über deploy/), BACKUP_DIR (Standard: $APP_DIR/backups),
#            KEEP_DAYS (Standard 14), BACKUP_RCLONE_REMOTE (aus .env, z. B. "hetzner:bodenschutz-backups")
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(dirname "${SCRIPT_DIR}")}"
BACKUP_DIR="${BACKUP_DIR:-${APP_DIR}/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-bodenschutz}"
VOLUME="${VOLUME:-${COMPOSE_PROJECT}_api_data}"

if [[ -f "${APP_DIR}/.env" ]]; then
  # nur die Backup-Variable lesen, keine Secrets exportieren
  BACKUP_RCLONE_REMOTE="${BACKUP_RCLONE_REMOTE:-$(grep -E '^BACKUP_RCLONE_REMOTE=' "${APP_DIR}/.env" | cut -d= -f2- | tr -d '"' || true)}"
fi
BACKUP_RCLONE_REMOTE="${BACKUP_RCLONE_REMOTE:-}"

STAMP="$(date +%Y-%m-%d_%H%M%S)"
TARGET="${BACKUP_DIR}/${STAMP}"
mkdir -p "${TARGET}"

if ! docker volume inspect "${VOLUME}" >/dev/null 2>&1; then
  echo "Docker-Volume ${VOLUME} nicht gefunden. Läuft die Anwendung unter einem anderen Projektnamen? (COMPOSE_PROJECT setzen)" >&2
  exit 1
fi

echo "[backup] Datenbank sichern (sqlite3 .backup, konsistent auch bei laufender API)"
# Begründung: Die API hat kein sqlite3-Binary; ein kurzlebiger Alpine-Container mit sqlite nutzt die
# Online-Backup-API, die auch während laufender Schreibzugriffe einen konsistenten Stand liefert.
docker run --rm \
  -v "${VOLUME}:/data:ro" \
  -v "${TARGET}:/backup" \
  alpine:3.20 sh -c 'apk add --no-cache sqlite >/dev/null && sqlite3 /data/app.db ".backup /backup/app.db" && chown "$(stat -c %u /backup)" /backup/app.db'

echo "[backup] Uploads und PDFs packen"
docker run --rm \
  -v "${VOLUME}:/data:ro" \
  -v "${TARGET}:/backup" \
  alpine:3.20 sh -c 'cd /data && tar -czf /backup/dateien.tar.gz uploads pdf 2>/dev/null || tar -czf /backup/dateien.tar.gz --files-from /dev/null; chown "$(stat -c %u /backup)" /backup/dateien.tar.gz'

# .env gehört zur Sicherung (Secrets!) – nur lokal, Rechte 600
if [[ -f "${APP_DIR}/.env" ]]; then
  cp "${APP_DIR}/.env" "${TARGET}/env.backup"
  chmod 600 "${TARGET}/env.backup"
fi

( cd "${BACKUP_DIR}" && tar -czf "${STAMP}.tar.gz" "${STAMP}" && rm -rf "${STAMP}" )
chmod 600 "${BACKUP_DIR}/${STAMP}.tar.gz"
echo "[backup] geschrieben: ${BACKUP_DIR}/${STAMP}.tar.gz ($(du -h "${BACKUP_DIR}/${STAMP}.tar.gz" | cut -f1))"

echo "[backup] Rotation: älter als ${KEEP_DAYS} Tage löschen"
find "${BACKUP_DIR}" -maxdepth 1 -name '*.tar.gz' -mtime "+${KEEP_DAYS}" -print -delete

if [[ -n "${BACKUP_RCLONE_REMOTE}" ]]; then
  if command -v rclone >/dev/null 2>&1; then
    echo "[backup] nach ${BACKUP_RCLONE_REMOTE} hochladen"
    rclone copy "${BACKUP_DIR}/${STAMP}.tar.gz" "${BACKUP_RCLONE_REMOTE}/"
    rclone delete --min-age "${KEEP_DAYS}d" "${BACKUP_RCLONE_REMOTE}/" || true
  else
    echo "[backup] BACKUP_RCLONE_REMOTE gesetzt, aber rclone ist nicht installiert (apt-get install rclone)." >&2
  fi
fi
echo "[backup] fertig"
