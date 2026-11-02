# Bodenschutz Austria – Vom Foto zum Angebot

Komplettes System für den Online-Berater von [bodenschutz-austria.at](https://bodenschutz-austria.at): Website mit Anfrage-Assistent, KI-Berater und Verwaltung, Handy-App (Android und iOS), Backend mit Regel-Engine, PDF und E-Mail-Automatik mit menschlicher Freigabe, dazu alles für den Betrieb auf einem eigenen Server.

**Grundsätze:** Die KI ordnet ein und formuliert. Mengen und Preise kommen aus festen Regeln. Nichts geht ohne Freigabe raus. Eine Anfrage ist noch keine Bestellung. Ein Foto ersetzt keine Vermessung.

## Was ist drin

| Ordner | Was | Technik |
|---|---|---|
| `packages/rules` | Regel-Engine: Platten, Paletten, Preise, Einstufung Standard/Prüffall | TypeScript, Vitest |
| `apps/api` | Backend: Daten, KI, PDF, E-Mail senden und lesen, Admin-Login | Fastify 5, Prisma 6, SQLite |
| `apps/web` | Website: Startseite mit 3D-Bühne, Anfrage-Assistent, KI-Chat, Recht, Verwaltung unter `/admin` | Next.js 16, Tailwind 4, motion, React Three Fiber |
| `apps/mobile` | App für Android und iOS: Foto, Maße, Mengen, Anfrage, Chat | Expo, React Native |
| `deploy/`, `docker-compose*.yml` | Betrieb: Docker-Images, Caddy mit HTTPS, Server-Setup, Backup, Update | Docker, Caddy, Bash |
| `docs/` | Konzept, Architektur, Recherche, Design-Entwürfe, Betriebshandbuch | Markdown, HTML |

## Schnellstart auf dem Laptop

Voraussetzungen: Node 24 und npm. Kein Docker nötig.

```bash
cp .env.example .env
```

In `.env` mindestens `SESSION_SECRET` (32 Zufallszeichen), `ADMIN_EMAIL` und `ADMIN_PASSWORD` setzen. Für KI-Antworten `ANTHROPIC_API_KEY` eintragen; ohne Schlüssel läuft alles, die KI antwortet dann mit Vorlagentexten.

```bash
npm run setup
```

```bash
npm run dev
```

Danach läuft:

- Website: http://localhost:3000
- Verwaltung: http://localhost:3000/admin (Login mit `ADMIN_EMAIL`/`ADMIN_PASSWORD`)
- API: http://localhost:4000/api/health
- Test-Postfach (alle gesendeten Mails landen hier): http://localhost:1080

Weitere Skripte im Root: `npm run build`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run dev:mobile`.

App auf dem Handy mit Expo Go:

```bash
npm run dev:mobile
```

Auf einem echten Handy muss die API-Adresse auf die Netzwerk-IP des Laptops zeigen, siehe `apps/mobile/README.md`.

## Betrieb auf dem eigenen Server

Alles läuft in drei Containern (API, Website, Caddy mit automatischem Let's-Encrypt-Zertifikat) auf einem kleinen Linux-Server. Einrichtung in einem Schritt auf Ubuntu 24.04:

```bash
export DOMAIN=bodenschutz-austria.at
curl -fsSL https://raw.githubusercontent.com/Cykruz/bodenschutz-austria/main/deploy/setup-server.sh | sudo bash
```

Danach `.env` ausfüllen (KI-Schlüssel, SMTP/IMAP für Marios Postfach) und `docker compose up -d --build`. Updates mit `./deploy/update.sh`, tägliche Sicherungen über `deploy/backup.sh`. Lokal mit Docker testen: `npm run docker:dev` (API, Website und MailDev ohne TLS).

Alles Weitere, auch in einfacher Sprache für Mario und mit der Checkliste vor dem Livegang: [docs/BETRIEB.md](docs/BETRIEB.md).

## Android-App für Mario

1. Kostenloses Expo-Konto anlegen, dann `npm i -g eas-cli`, `eas login`, in `apps/mobile` einmal `eas init`.
2. `eas build -p android --profile preview` erzeugt eine APK mit Download-Link. Den Link kann man per WhatsApp teilen; Installation aus unbekannter Quelle muss am Handy erlaubt werden. Den Link in `.env` als `NEXT_PUBLIC_ANDROID_APK_URL` eintragen, dann zeigt ihn die Website unter `/app`.
3. Für den Play Store: `eas build -p android --profile production` erzeugt ein AAB für den internen Test in der Play Console.
4. iPhone braucht ein Apple-Developer-Konto; die Konfiguration ist vorbereitet.

Details in `apps/mobile/README.md`.

## Was Mario liefern muss

- Echte Produktdaten: Maße, Stärke, Gewicht, Platten je Palette, Preis je Platte (in der Verwaltung unter Produkte, dann „von Mario bestätigt“ anhaken)
- Frachtkosten je Liefergebiet und Entladebedingungen (Verwaltung, Frachtzonen)
- Zugangsdaten zum Postfach (IMAP und SMTP)
- Anthropic-API-Schlüssel (oder wir legen ihn gemeinsam an)
- Impressumsdaten: UID, Firmenbuchnummer und -gericht, Kammer, Gewerbe
- Google-Play-Konto und später Apple-Developer-Konto
- Domain-Zugang (DNS) und ein Server (2 vCPU, 4 GB RAM, 40 GB SSD, Ubuntu 24.04)

## Dokumente

- [Architektur und Schnittstellen](docs/ARCHITEKTUR.md)
- [Betrieb: Server, Einrichtung, Alltag, Checkliste vor dem Livegang](docs/BETRIEB.md)
- [Recherche: bestehende Seite, Vorbilder, Recht](docs/RECHERCHE.md)
- [Design-Richtung Website](docs/DESIGN-RICHTUNG.md) und [Design-Entwürfe](docs/design/)
- [Konzept als Präsentation](docs/Bodenschutz-Austria-Praesentation.md)
