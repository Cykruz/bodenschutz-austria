# Bodenschutz Austria – Vom Foto zum Angebot

Komplettes System für den Online-Berater von [bodenschutz-austria.at](https://bodenschutz-austria.at): Handy-App (Android und iOS), Website mit Anfrage-Assistent und KI-Berater, Backend mit Verwaltung, E-Mail-Automatik mit menschlicher Freigabe.

**Grundsätze:** Die KI ordnet ein und formuliert. Mengen und Preise kommen aus festen Regeln. Nichts geht ohne Freigabe raus. Eine Anfrage ist noch keine Bestellung. Ein Foto ersetzt keine Vermessung.

## Was ist drin

| Ordner | Was | Technik |
|---|---|---|
| `packages/rules` | Regel-Engine: Platten, Paletten, Preise, Einstufung Standard/Prüffall | TypeScript, Vitest |
| `apps/api` | Backend: Daten, KI, PDF, E-Mail senden und lesen, Admin-Login | Fastify, Prisma, SQLite |
| `apps/web` | Website: Startseite, Anfrage-Assistent, KI-Chat, Recht, Verwaltung unter `/admin` | Next.js, Tailwind, motion, React Three Fiber |
| `apps/mobile` | App für Android und iOS: Foto, Maße, Mengen, Anfrage, Chat | Expo, React Native |
| `docs/` | Konzept, Architektur, Recherche, Design-Richtung | Markdown |

## Schnellstart auf dem Laptop

Voraussetzungen: Node 24 und npm. Kein Docker nötig.

```bash
cp .env.example .env
```

Dann in `.env` mindestens `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` setzen. Für KI-Antworten `ANTHROPIC_API_KEY` eintragen. Ohne Schlüssel läuft alles, die KI antwortet dann mit Vorlagentexten.

```bash
npm run setup
```

```bash
npm run dev
```

Danach läuft:

- Website: http://localhost:3000
- Verwaltung: http://localhost:3000/admin
- API: http://localhost:4000/api/health
- Test-Postfach (alle gesendeten Mails landen hier): http://localhost:1080

App auf dem Handy mit Expo Go:

```bash
npm run dev:mobile
```

Auf einem echten Handy muss die API-Adresse auf die Netzwerk-IP des Laptops zeigen, siehe `apps/mobile/README.md`.

## E-Mail-Postfach anbinden

Für den Testbetrieb schickt die API an MailDev (Port 1025). Für Marios echtes Postfach in `.env` die SMTP-Werte (senden) und IMAP-Werte (lesen) eintragen. Sobald `IMAP_HOST` gesetzt ist, liest der Postfach-Dienst neue Mails, ordnet sie ein und legt KI-Entwürfe in der Verwaltung ab. Automatisch gesendet wird nur, wenn in der Verwaltung der Schalter „Automatischer Versand“ an ist UND die passende Regel es erlaubt. Standard: aus.

## Android-App für Mario

1. Kostenloses Expo-Konto anlegen, dann `npm i -g eas-cli`, `eas login`, in `apps/mobile` einmal `eas init`.
2. `eas build -p android --profile preview` erzeugt eine APK mit Download-Link. Den Link kann man per WhatsApp teilen; Installation aus unbekannter Quelle muss am Handy erlaubt werden.
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
- Domain und Hosting für den Livebetrieb

## Dokumente

- [Architektur und Schnittstellen](docs/ARCHITEKTUR.md)
- [Recherche: bestehende Seite, Vorbilder, Recht](docs/RECHERCHE.md)
- [Design-Richtung Website](docs/DESIGN-RICHTUNG.md)
- [Konzept als Präsentation](docs/Bodenschutz-Austria-Praesentation.md)
