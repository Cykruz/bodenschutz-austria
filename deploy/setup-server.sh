#!/usr/bin/env bash
# Einrichtung eines frischen Ubuntu-24.04-Servers für Bodenschutz Austria.
# Idempotent: kann mehrfach laufen, überspringt Vorhandenes.
#
# Aufruf als root (oder mit sudo):
#   curl -fsSL https://raw.githubusercontent.com/Cykruz/bodenschutz-austria/main/deploy/setup-server.sh | sudo bash
# oder nach dem Klonen:
#   sudo ./deploy/setup-server.sh
#
# Variablen (optional, vor dem Aufruf setzen):
#   REPO_URL     Git-Adresse (Standard: https://github.com/Cykruz/bodenschutz-austria.git)
#   REPO_BRANCH  Branch (Standard: main)
#   APP_DIR      Zielordner (Standard: /opt/bodenschutz)
#   APP_USER     Betriebsnutzer (Standard: bodenschutz)
#   DOMAIN       Domain, wird in die .env eingetragen, wenn gesetzt
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Cykruz/bodenschutz-austria.git}"
REPO_BRANCH="${REPO_BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/bodenschutz}"
APP_USER="${APP_USER:-bodenschutz}"

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Bitte als root ausführen (sudo)." >&2
  exit 1
fi

if ! grep -qi 'ubuntu' /etc/os-release; then
  warn "Dieses Skript ist für Ubuntu 24.04 gedacht. Andere Systeme auf eigene Verantwortung."
fi

export DEBIAN_FRONTEND=noninteractive

log "Systempakete aktualisieren"
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg git ufw unattended-upgrades apt-listchanges openssl

log "Automatische Sicherheitsupdates aktivieren"
dpkg-reconfigure -f noninteractive unattended-upgrades
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
CONF

log "Docker installieren (offizielles Repository)"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  # shellcheck disable=SC1091
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    >/etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "Docker ist bereits installiert: $(docker --version)"
fi
systemctl enable --now docker

log "Firewall: nur SSH, HTTP und HTTPS"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable
ufw status verbose | sed 's/^/    /'

log "Betriebsnutzer ${APP_USER} anlegen"
if ! id "${APP_USER}" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "${APP_USER}"
fi
usermod -aG docker "${APP_USER}"

log "Anwendung nach ${APP_DIR} holen"
if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "${APP_DIR}" fetch --depth 1 origin "${REPO_BRANCH}"
  git -C "${APP_DIR}" checkout -q "${REPO_BRANCH}"
  git -C "${APP_DIR}" pull -q --ff-only origin "${REPO_BRANCH}"
else
  git clone --depth 1 --branch "${REPO_BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

log ".env vorbereiten"
ENV_FILE="${APP_DIR}/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${APP_DIR}/.env.example" "${ENV_FILE}"
  SECRET="$(openssl rand -hex 32)"
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=${SECRET}|" "${ENV_FILE}"
  ADMIN_PW="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)"
  sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_PW}|" "${ENV_FILE}"
  sed -i "s|^ADMIN_EMAIL=.*|ADMIN_EMAIL=info@bodenschutz-austria.at|" "${ENV_FILE}"
  if [[ -n "${DOMAIN:-}" ]]; then
    sed -i "s|^DOMAIN=.*|DOMAIN=${DOMAIN}|" "${ENV_FILE}"
    sed -i "s|^PUBLIC_WEB_URL=.*|PUBLIC_WEB_URL=https://${DOMAIN}|" "${ENV_FILE}"
    sed -i "s|^PUBLIC_API_URL=.*|PUBLIC_API_URL=https://${DOMAIN}|" "${ENV_FILE}"
    sed -i "s|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://${DOMAIN}|" "${ENV_FILE}"
  fi
  echo "    Neue .env angelegt. Admin-Passwort (jetzt notieren, steht auch in der .env): ${ADMIN_PW}"
else
  echo "    .env vorhanden, wird nicht überschrieben."
fi
chown "${APP_USER}:${APP_USER}" "${ENV_FILE}"
chmod 600 "${ENV_FILE}"

log "Backup-Verzeichnis und Cron"
install -d -o "${APP_USER}" -g "${APP_USER}" -m 750 "${APP_DIR}/backups"
if [[ ! -f /etc/cron.d/bodenschutz-backup ]]; then
  sed "s|/opt/bodenschutz|${APP_DIR}|g; s|bodenschutz |${APP_USER} |" "${APP_DIR}/deploy/cron.example" >/etc/cron.d/bodenschutz-backup
  chmod 644 /etc/cron.d/bodenschutz-backup
fi

cat <<INFO

Fail2ban (empfohlen, nicht automatisch installiert):
    apt-get install -y fail2ban && systemctl enable --now fail2ban
  schützt SSH vor Passwort-Rateversuchen. Besser zusätzlich: SSH nur mit Schlüssel, PasswordAuthentication no.

INFO

if ! grep -q '^ANTHROPIC_API_KEY=.\+' "${ENV_FILE}" || ! grep -q '^DOMAIN=.\+' "${ENV_FILE}"; then
  warn "Bitte jetzt ${ENV_FILE} ausfüllen: DOMAIN, ANTHROPIC_API_KEY, SMTP_*, IMAP_* (siehe docs/BETRIEB.md)."
fi

log "Container bauen und starten (das dauert beim ersten Mal einige Minuten)"
cd "${APP_DIR}"
if grep -q '^DOMAIN=.\+' "${ENV_FILE}"; then
  sudo -u "${APP_USER}" docker compose up -d --build
  echo
  echo "Fertig. Prüfen mit: docker compose ps   und   curl -fsS https://\$(grep ^DOMAIN= .env | cut -d= -f2)/api/health"
else
  warn "DOMAIN ist noch nicht gesetzt, Start übersprungen. Nach dem Ausfüllen der .env: cd ${APP_DIR} && docker compose up -d --build"
fi
