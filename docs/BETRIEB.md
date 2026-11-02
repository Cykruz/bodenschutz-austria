# Betrieb: Server, Einrichtung, Alltag

Diese Anleitung hat drei Teile: **Teil A** für den Techniker (Server aufsetzen, Updates, Backups, Fehlersuche), **Teil B** für Mario in einfacher Sprache (was läuft wo, Login, was tun, wenn etwas nicht geht) und **Teil C** die Checkliste vor dem Livegang.

Alles läuft in Docker-Containern auf einem einzigen Linux-Server: die **API** (Daten, KI, PDF, E-Mail), die **Website** (öffentliche Seiten und Verwaltung unter `/admin`) und **Caddy** (nimmt die Anfragen aus dem Internet an, kümmert sich um HTTPS-Zertifikate und leitet `/api/*` an die API, alles andere an die Website). Die Handy-App spricht über das Internet mit derselben API.

```
Internet ──HTTPS──▶ Caddy (Port 80/443) ──▶ /api/*  ──▶ api  (Fastify, Port 4000 intern, Volume api_data)
                                        └──▶ /*      ──▶ web  (Next.js, Port 3000 intern)
Marios Postfach ◀──SMTP/IMAP──▶ api        Anthropic-API ◀──HTTPS──▶ api
```

---

## Teil A: Für den Techniker

### A.1 Server

- Empfehlung: 2 vCPU, 4 GB RAM, 40 GB SSD, Ubuntu 24.04 LTS (z. B. Hetzner CX22/CAX11, netcup, IONOS). Mehr braucht es nicht; SQLite und drei Container sind genügsam.
- Zugang per SSH mit Schlüssel. Passwort-Login nach der Einrichtung abschalten (`PasswordAuthentication no` in `/etc/ssh/sshd_config`).
- Offene Ports: nur 22 (SSH), 80 und 443 (Caddy). Alles andere bleibt zu; das Setup-Skript richtet `ufw` entsprechend ein.
- Empfohlen zusätzlich: `apt-get install fail2ban && systemctl enable --now fail2ban` gegen SSH-Rateversuche.

### A.2 DNS

Beim Domain-Anbieter zwei Einträge auf die IP des Servers setzen (IPv6 analog mit AAAA, falls vorhanden):

| Typ | Name | Wert |
|---|---|---|
| A | `bodenschutz-austria.at` | Server-IP |
| A | `www.bodenschutz-austria.at` | Server-IP |

Erst wenn `dig +short bodenschutz-austria.at` die Server-IP liefert, kann Caddy das Zertifikat holen. Bis dahin ist die Seite nur über HTTP nicht erreichbar, das ist normal.

### A.3 Einrichtung mit dem Setup-Skript

Als root auf dem Server:

```bash
export DOMAIN=bodenschutz-austria.at
curl -fsSL https://raw.githubusercontent.com/Cykruz/bodenschutz-austria/main/deploy/setup-server.sh | bash
```

Das Skript ist idempotent (mehrfacher Lauf schadet nicht) und macht:

1. Systemupdate, `unattended-upgrades` (automatische Sicherheitsupdates)
2. Docker aus dem offiziellen Repository inkl. Compose-Plugin
3. Firewall `ufw`: 22/80/443
4. Nutzer `bodenschutz` (Mitglied der Gruppe `docker`), Anwendung nach `/opt/bodenschutz`
5. `.env` aus `.env.example` mit zufälligem `SESSION_SECRET` und zufälligem Admin-Passwort, Rechte `600`
6. Backup-Cron (`/etc/cron.d/bodenschutz-backup`, täglich 03:00)
7. `docker compose up -d --build`, sobald `DOMAIN` in der `.env` steht

Das Admin-Passwort wird einmal angezeigt und steht in der `.env` (`ADMIN_PASSWORD`). Es gilt nur für den **ersten** Seed; später lässt es sich nur per Datenbank ändern (siehe A.9).

Privates Repository: Das Skript klont per HTTPS. Bei einem privaten Repo vorher einen Deploy-Key oder ein Token einrichten (`REPO_URL=https://TOKEN@github.com/Cykruz/bodenschutz-austria.git`), oder das Repository von Hand nach `/opt/bodenschutz` legen und das Skript danach ausführen.

### A.4 `.env` ausfüllen

Datei: `/opt/bodenschutz/.env` (Rechte 600, gehört `bodenschutz`). Niemals ins Repository, niemals per Chat verschicken.

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `DOMAIN` | ja | Domain ohne `https://` |
| `ACME_EMAIL` | ja | Kontakt für Let's Encrypt |
| `SESSION_SECRET` | ja | mind. 32 Zeichen, setzt das Skript |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | ja | erster Verwaltungszugang (beim ersten Start angelegt) |
| `ANTHROPIC_API_KEY` | für KI | Schlüssel aus https://console.anthropic.com. Ohne Schlüssel laufen Website, Rechner und Verwaltung normal; Chat, Fotoeinschätzung und Entwürfe antworten dann mit Vorlagentexten. |
| `ANTHROPIC_MODEL` | nein | Standard `claude-sonnet-5-5` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | für Versand | Marios Postfach (Ausgang). Bei den meisten Anbietern: Port 465 mit `SMTP_SECURE=true` oder Port 587 mit `SMTP_SECURE=false`. `MAIL_FROM` muss zur Postfachadresse passen. |
| `IMAP_HOST`, `IMAP_PORT`, `IMAP_SECURE`, `IMAP_USER`, `IMAP_PASS`, `IMAP_POLL_SECONDS` | für Posteingang | Marios Postfach (Eingang). `IMAP_HOST` leer = Posteingangs-Dienst aus. Gmail: `imap.gmail.com`, 993, App-Passwort. |
| `ADMIN_ALLOW_IPS` | nein | Verwaltung nur von diesen IPs/Netzen (Leerzeichen-getrennt). Leer = überall, der Login schützt. |
| `NEXT_PUBLIC_ANDROID_APK_URL` | nein | Direkter APK-Link für die Website; Änderung braucht `docker compose build web` |
| `BACKUP_RCLONE_REMOTE` | nein | rclone-Ziel für Backups außerhalb des Servers |
| `API_IMAGE`, `WEB_IMAGE` | nein | fertige Images von ghcr.io statt lokalem Build |

Nach Änderungen an der `.env`: `docker compose up -d` (API und Caddy lesen sie beim Start). Variablen, die mit `NEXT_PUBLIC_` beginnen oder `DOMAIN`, stecken im Website-Image: dann `docker compose up -d --build web`.

### A.5 Erster Start und Kontrolle

```bash
cd /opt/bodenschutz
docker compose up -d --build        # erster Build dauert 5–10 Minuten
docker compose ps                   # alle drei "healthy"
docker compose logs -f api          # beim ersten Start: Schema anlegen, Seed, "API läuft"
curl -fsS https://bodenschutz-austria.at/api/health   # {"ok":true}
```

Der API-Container führt bei jedem Start `prisma db push` (Schema) und den Seed aus. Der Seed legt nur an, was fehlt (Produkt classicXtreme mit Platzhalterwerten, vier Frachtzonen, Regeln, Einstellungen, Admin) und überschreibt nie bestehende Daten.

Danach: `https://bodenschutz-austria.at/admin`, Login mit `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Unter **Produkte** und **Frachtzonen** die echten Werte eintragen und „von Mario bestätigt“ anhaken.

### A.6 Backups

- Skript: `deploy/backup.sh`, läuft täglich 03:00 per Cron als Nutzer `bodenschutz`; Log in `/opt/bodenschutz/backups/backup.log`.
- Inhalt je Sicherung (`backups/JJJJ-MM-TT_HHMMSS.tar.gz`, Rechte 600): `app.db` (SQLite über die Online-Backup-API, daher konsistent auch bei laufender API), `dateien.tar.gz` (Uploads und PDFs), `env.backup` (die `.env`, enthält Secrets).
- Rotation: 14 Tage. Außer-Haus-Kopie: `rclone config` einrichten und `BACKUP_RCLONE_REMOTE` setzen, dann lädt das Skript jede Sicherung hoch und löscht dort ebenfalls nach 14 Tagen.
- Manuell: `./deploy/backup.sh`. Prüfen: `tar -tzf backups/<datei>.tar.gz`.
- Wiederherstellen: `./deploy/restore.sh backups/<datei>.tar.gz` (fragt nach, legt vorher eine Sicherung des aktuellen Stands an, stoppt die API kurz).

### A.7 Updates

```bash
cd /opt/bodenschutz
./deploy/update.sh            # Backup, git pull, Build, Neustart, Schema, Smoke-Test
```

Mit fertigen Images (werden vom Workflow `.github/workflows/deploy.yml` bei jedem Tag `v*` nach `ghcr.io/cykruz/bodenschutz-api` und `ghcr.io/cykruz/bodenschutz-web` gebaut): `API_IMAGE`/`WEB_IMAGE` in der `.env` setzen und `USE_REGISTRY=1 ./deploy/update.sh`. Bei privaten Paketen vorher `docker login ghcr.io`.

Automatischer Deploy: In GitHub unter *Settings → Secrets* `DEPLOY_HOST`, `DEPLOY_USER` (z. B. `bodenschutz`) und `DEPLOY_SSH_KEY` (privater Schlüssel, dessen öffentlicher Teil in `~bodenschutz/.ssh/authorized_keys` liegt) hinterlegen. Dann führt der Workflow nach dem Image-Build `deploy/update.sh` per SSH aus. Ohne diese Secrets wird der Schritt übersprungen.

Rollback: `git checkout <alter Tag>` und `docker compose up -d --build`, oder mit Registry-Images die alte Version in `API_IMAGE`/`WEB_IMAGE` eintragen. Datenbank bei Bedarf aus dem Backup zurückspielen.

### A.8 Logs

```bash
docker compose logs -f            # alles
docker compose logs -f api        # API: Anfragen, KI-Aufrufe, Mails, Posteingang
docker compose logs -f caddy      # Zugriffe, Zertifikate
docker compose logs --since 1h web
```

Logs rotieren automatisch (10 MB × 5 je Container). Die Verwaltung zeigt unter **Protokoll** alle gesendeten und empfangenen E-Mails.

### A.9 Häufige Fehler

| Symptom | Ursache / Lösung |
|---|---|
| Seite nicht erreichbar, Caddy-Log „obtaining certificate … failed“ | DNS zeigt noch nicht auf den Server oder Port 80/443 zu. `dig +short DOMAIN`, `ufw status`, Firewall des Hosters prüfen. Caddy versucht es automatisch weiter. |
| API-Container startet nicht, Log „SESSION_SECRET muss … mindestens 32 Zeichen“ | `SESSION_SECRET` in der `.env` setzen: `openssl rand -hex 32` |
| „Origin nicht erlaubt“ bei Anfragen von der Website | `DOMAIN` in der `.env` falsch; API erlaubt nur `https://DOMAIN`. `docker compose up -d`. |
| Mails gehen nicht raus | SMTP-Werte prüfen: `docker compose logs api | grep -i smtp`. Port/`SMTP_SECURE` passen? `MAIL_FROM` gleich Postfachadresse? Anbieter braucht evtl. App-Passwort. |
| Posteingang bleibt leer | `IMAP_HOST` gesetzt? Log zeigt „IMAP-Postfach: aktiv“. Der Dienst liest nur ungelesene Mails; eigene Absenderadresse wird ignoriert. |
| KI antwortet nur mit Vorlagentexten | `ANTHROPIC_API_KEY` fehlt oder ungültig; Log beim Start: „KI: nicht konfiguriert“. Guthaben in der Anthropic-Konsole prüfen. |
| Foto-Upload schlägt fehl (413) | Datei größer als 8 MB oder kein JPEG/PNG/WebP. Caddy erlaubt 12 MB Request. |
| Verwaltung 403 „von dieser Adresse nicht erlaubt“ | `ADMIN_ALLOW_IPS` gesetzt und eigene IP nicht dabei. Leeren oder IP ergänzen, `docker compose up -d caddy`. |
| Admin-Passwort vergessen | Neues Hash setzen: `docker compose exec api node -e "const b=require('bcryptjs');console.log(b.hashSync(process.argv[1],12))" 'NEUESPASSWORT'` und den Wert in der Tabelle `AdminUser` eintragen (`docker compose exec api npx prisma studio` oder sqlite3 im Backup-Container). Alternativ Nutzer löschen, `ADMIN_PASSWORD` in `.env` ändern, API neu starten: der Seed legt ihn neu an. |
| Platte voll | `docker system prune -f`, alte Backups prüfen, Logs (`docker compose logs` rotiert selbst). |
| Nach Update weiße Seite | `docker compose logs web`; meist fehlgeschlagener Build. `docker compose build web && docker compose up -d`. |

### A.10 Sicherheit (Stand der Umsetzung)

- Container laufen als Nutzer `node` (kein Root), nur Caddy veröffentlicht Ports.
- Secrets nur in der `.env` (Rechte 600), nie im Image oder Repository. Der Deploy-Workflow baut Images ohne Secrets.
- Caddy setzt HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`; die Website setzt zusätzlich eine Content-Security-Policy mit Nonce.
- API: Helmet, CORS nur für die eigene Domain, Rate-Limits (Chat, Foto, Anfragen, Login), Upload-Prüfung per Magic Bytes, Login-Sperre nach Fehlversuchen, Cookie `bsa_admin` HttpOnly.
- Automatische Sicherheitsupdates des Systems; Docker-Images bei Updates mit `--pull` erneuern.
- Empfohlen: Fail2ban, SSH nur mit Schlüssel, Backups außer Haus (rclone), Monitoring des Healthchecks (z. B. Uptime-Kuma oder ein externer Dienst auf `https://DOMAIN/api/health`).

---

## Teil B: Für Mario, in einfacher Sprache

### Was läuft wo

- **Die Website** `https://bodenschutz-austria.at`: Hier sehen Kundinnen und Kunden das Produkt, rechnen Mengen aus, stellen Fragen an den KI-Berater und schicken Anfragen.
- **Die App** auf dem Handy macht dasselbe wie die Website, nur mit Kamera direkt von der Baustelle.
- **Die Verwaltung** `https://bodenschutz-austria.at/admin`: Dein Arbeitsplatz. Hier siehst du alle Anfragen und E-Mails, prüfst die Entwürfe und gibst sie frei.
- **Dein Postfach**: Alles, was rausgeht, geht über deine E-Mail-Adresse. Alles, was reinkommt, liest das System mit und legt dir Entwürfe in die Verwaltung.

Alles zusammen läuft auf **einem Server** im Rechenzentrum. Du musst nichts installieren und nichts laufen lassen.

### Login in die Verwaltung

1. `https://bodenschutz-austria.at/admin` im Browser öffnen (Handy oder Computer).
2. E-Mail und Passwort eingeben (hast du vom Techniker bekommen). Passwort nirgends speichern außer im Passwort-Manager.
3. Du landest auf der **Übersicht**: Zahlen zu Anfragen und Mails, der Schalter „Automatischer Versand“ und die Erklärung, wie Anfragen sortiert werden.

### So arbeitest du mit Anfragen

1. **Anfragen** öffnen. Neue Anfragen stehen oben. Grün = Standardfall, orange = Prüffall (da musst du genauer hinschauen).
2. Anfrage anklicken: Du siehst Kundendaten, Foto, Maße, die berechneten Mengen und den **KI-Entwurf** des Angebots.
3. Entwurf lesen, bei Bedarf ändern. Dann **„Freigeben und senden“**: Der Kunde bekommt die Mail mit PDF. Oder **„Rückfrage senden“**, wenn etwas fehlt. Oder **„Ablehnen“**.
4. Alles, was gesendet wurde, steht unter **Protokoll**.

Der Schalter **„Automatischer Versand“** bleibt am Anfang **aus**. Dann geht nichts ohne dich raus. Erst wenn du den Entwürfen vertraust, kannst du unter **Regeln** einzelne Dinge freigeben (z. B. Eingangsbestätigung automatisch) und den Schalter einschalten.

### Deine Produktdaten

Unter **Produkte** und **Frachtzonen** stehen am Anfang **Platzhalter** (in der Verwaltung orange markiert). Trag die echten Maße, Gewichte, Platten je Palette, Preise und Frachtkosten ein und hake „von Mario bestätigt“ an. Vorher zeigt die Website Werte in eckigen Klammern und schreibt „Platzhalter“ dazu.

### Was tun, wenn etwas nicht geht

| Problem | Das machst du |
|---|---|
| Website lädt nicht | 2 Minuten warten, noch einmal versuchen (auch am Handy über mobile Daten). Geht es immer noch nicht: Techniker anrufen. |
| Login geht nicht | Groß-/Kleinschreibung beim Passwort prüfen. Sonst Techniker: Passwort zurücksetzen. |
| Kunde sagt, er hat keine Mail bekommen | Unter **Protokoll** nachsehen, ob die Mail als „gesendet“ steht. Wenn ja: Spam-Ordner beim Kunden. Wenn nein: noch einmal freigeben, sonst Techniker. |
| Der KI-Berater antwortet komisch oder nur mit Standardtext | Das ist kein Notfall. Der Techniker prüft den KI-Schlüssel. Anfragen und Rechner laufen trotzdem. |
| Du hast etwas versehentlich gelöscht oder falsch geändert | Nicht weiterklicken. Techniker anrufen; es gibt tägliche Sicherungen der letzten 14 Tage. |

**Wen anrufen:** den Techniker, der den Server eingerichtet hat (Name und Nummer hier eintragen: ____________________). Für Domain und E-Mail-Postfach: dein Domain-/Hosting-Anbieter.

### Datensicherung

Jede Nacht um 3 Uhr macht der Server automatisch eine Sicherung (Datenbank, Fotos, PDFs). Die letzten 14 Tage werden aufbewahrt. Du musst nichts tun. Wichtig ist nur: Wenn etwas kaputtgeht, **sofort melden**, solange die Sicherung noch da ist.

---

## Teil C: Checkliste „Vor dem Livegang“

- [ ] **Impressum vollständig**: UID, Firmenbuchnummer und -gericht, Kammer, Gewerbe, Aufsichtsbehörde eingetragen (`apps/web/lib/site.ts`, `PLACEHOLDER`), keine `[PLATZHALTER]` mehr auf `/impressum`.
- [ ] **Datenschutzerklärung** geprüft, KI-Abschnitt (Anthropic als Auftragsverarbeiter, Drittlandtransfer, Speicherdauer) stimmt mit dem tatsächlichen Vertrag überein; Auftragsverarbeitungsvertrag mit Anthropic abgeschlossen.
- [ ] **Platzhalterdaten ersetzt und bestätigt**: Produkte (Maße, Stärke, Gewicht, Platten je Palette, Preis) und Frachtzonen in der Verwaltung eingetragen, „von Mario bestätigt“ gesetzt; Hinweis „Platzhalterdaten aktiv“ auf der Übersicht verschwunden.
- [ ] **Automatischer Versand aus**, alle Regeln auf manuell (Standard nach dem Seed).
- [ ] **Test-Anfrage von der Website** bis zur Bestätigungsseite, in der Verwaltung geöffnet, freigegeben, Mail mit PDF beim Testempfänger angekommen.
- [ ] **Test-Anfrage aus der App** (Android-APK oder Expo Go) mit Foto, in der Verwaltung sichtbar.
- [ ] **Postfach-Test**: Testmail an Marios Adresse, erscheint im Posteingang der Verwaltung mit Entwurf; Antwort aus der Verwaltung kommt beim Absender an.
- [ ] **Backup-Test**: `./deploy/backup.sh` ausgeführt, Archiv vorhanden, `./deploy/restore.sh` auf einem Testsystem oder mit Rückfrage geprüft; rclone-Ziel eingerichtet.
- [ ] **HTTPS-Test**: `https://bodenschutz-austria.at` und `https://www…` leiten korrekt, Zertifikat gültig (z. B. https://www.ssllabs.com/ssltest/), `http://` leitet auf `https://`.
- [ ] **Admin-Zugang**: starkes Passwort, optional `ADMIN_ALLOW_IPS`; SSH nur mit Schlüssel, Fail2ban aktiv.
- [ ] **KI-Schlüssel** gesetzt und Guthaben/Limit in der Anthropic-Konsole eingestellt; Chat zeigt KI-Kennzeichnung.
- [ ] **Monitoring**: externer Check auf `/api/health` eingerichtet, Techniker-Kontakt in Teil B eingetragen.
