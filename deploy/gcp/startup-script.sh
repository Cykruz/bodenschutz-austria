#!/usr/bin/env bash
# Startskript für eine Google-Compute-Engine-VM (Ubuntu 24.04): richtet Bodenschutz Austria beim ersten Start
# vollautomatisch ein. Läuft als root bei jedem Boot, überspringt aber alles, was schon erledigt ist.
#
# Erwartete VM-Metadaten (in der Cloud Console unter „Metadaten“ bzw. per gcloud --metadata):
#   DOMAIN         z. B. demo.bodenschutz-austria.at (Pflicht)
#   REPO_TOKEN     GitHub-Token mit Lesezugriff auf Cykruz/bodenschutz-austria (Pflicht, solange das Repo privat ist)
#   REPO_BRANCH    Branch, Standard main
#   DEMO_USER      Benutzer für den Vorab-Zugang (optional, z. B. mario)
#   DEMO_PASSWORD  Passwort für den Vorab-Zugang (optional; wird nur als bcrypt-Hash in die .env geschrieben)
#   ANTHROPIC_API_KEY  optional, für echte KI-Antworten
set -euo pipefail

META="http://metadata.google.internal/computeMetadata/v1/instance/attributes"
meta() { curl -fsS -H 'Metadata-Flavor: Google' "${META}/$1" 2>/dev/null || true; }

DOMAIN="$(meta DOMAIN)"
REPO_TOKEN="$(meta REPO_TOKEN)"
REPO_BRANCH="$(meta REPO_BRANCH)"; REPO_BRANCH="${REPO_BRANCH:-main}"
DEMO_USER="$(meta DEMO_USER)"
DEMO_PASSWORD="$(meta DEMO_PASSWORD)"
ANTHROPIC_API_KEY="$(meta ANTHROPIC_API_KEY)"
APP_DIR=/opt/bodenschutz
MARK=/var/lib/bodenschutz-setup.done

if [[ -f "${MARK}" ]]; then
  echo "[gcp-startup] bereits eingerichtet, Container werden gestartet"
  if cd "${APP_DIR}"; then docker compose up -d || true; fi
  exit 0
fi
if [[ -z "${DOMAIN}" ]]; then
  echo "[gcp-startup] Metadatum DOMAIN fehlt, Abbruch" >&2
  exit 1
fi

if [[ -n "${REPO_TOKEN}" ]]; then
  REPO_URL="https://x-access-token:${REPO_TOKEN}@github.com/Cykruz/bodenschutz-austria.git"
else
  REPO_URL="https://github.com/Cykruz/bodenschutz-austria.git"
fi

echo "[gcp-startup] Setup-Skript aus dem Repository holen und ausführen"
apt-get update -y >/dev/null
apt-get install -y git >/dev/null
rm -rf /tmp/bsa-src
git clone --depth 1 --branch "${REPO_BRANCH}" "${REPO_URL}" /tmp/bsa-src
export DOMAIN REPO_URL REPO_BRANCH
bash /tmp/bsa-src/deploy/setup-server.sh

# Token aus der gespeicherten Remote-Adresse entfernen (steht sonst in .git/config)
if [[ -n "${REPO_TOKEN}" ]]; then
  git -C "${APP_DIR}" remote set-url origin https://github.com/Cykruz/bodenschutz-austria.git
  git -C "${APP_DIR}" config credential.helper 'store --file /root/.bsa-git-credentials'
  printf 'https://x-access-token:%s@github.com\n' "${REPO_TOKEN}" > /root/.bsa-git-credentials
  chmod 600 /root/.bsa-git-credentials
fi

ENV_FILE="${APP_DIR}/.env"
if [[ -n "${ANTHROPIC_API_KEY}" ]]; then
  sed -i "s|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}|" "${ENV_FILE}"
fi
if [[ -n "${DEMO_USER}" && -n "${DEMO_PASSWORD}" ]]; then
  HASH="$(docker run --rm caddy:2-alpine caddy hash-password --plaintext "${DEMO_PASSWORD}")"
  # In der .env muss jedes $ als $$ stehen, sonst liest Docker Compose den Hash als Variablen und leert ihn
  HASH="${HASH//\$/\$\$}"
  sed -i "s|^BASIC_AUTH_USER=.*|BASIC_AUTH_USER=${DEMO_USER}|" "${ENV_FILE}"
  sed -i "s|^BASIC_AUTH_HASH=.*|BASIC_AUTH_HASH=${HASH}|" "${ENV_FILE}"
  echo "[gcp-startup] Vorab-Zugang für ${DEMO_USER} gesetzt"
fi
chmod 600 "${ENV_FILE}"

cd "${APP_DIR}"
sudo -u bodenschutz docker compose up -d --build
touch "${MARK}"
echo "[gcp-startup] fertig: https://${DOMAIN} (Zertifikat kommt, sobald der DNS-Eintrag auf diese VM zeigt)"
