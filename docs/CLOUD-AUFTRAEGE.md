# Cloud-Aufträge (bereit zum Start)

Drei parallele Cloud-Sitzungen, je eigener Branch und Pull Request gegen `main`. Jede Sitzung liest zuerst `docs/ARCHITEKTUR.md` (verbindlich), `docs/RECHERCHE.md` und `docs/Bodenschutz-Austria-Praesentation.md`. Kein Paket fasst die Ordner der anderen an.

| Sitzung | Ordner | Branch | Ergebnis |
|---|---|---|---|
| Regel-Engine und Backend | `packages/rules`, `apps/api` | `feat/api` | Fastify-API mit SQLite, KI, PDF, SMTP/IMAP, Tests, CI |
| Website, Design, Verwaltung | `apps/web` | `feat/web` | Next.js-Site mit Top-Design, Assistent, Chat, Recht, SEO, `/admin` |
| Expo-App | `apps/mobile` | `feat/mobile` | Android/iOS-App mit Foto, Rechner, Anfrage, Chat, EAS-Profile |

Danach: Integrationslauf (alles zusammen starten, Ablauf Ende zu Ende prüfen, README, Android-APK über EAS).

## Auftrag 1: Regel-Engine und Backend

Baue `packages/rules` (`@bodenschutz/rules`, ESM, TypeScript strict, tsc nach `dist`) exakt nach den Typen und Funktionen `calculate` und `classify` der Architektur: Fahrspuren-Fläche = lengthM × laneWidthM × laneCount (Standard Plattenbreite, 2 Spuren); Platten = ceil(Fläche × wasteFactor / Plattenfläche); Paletten = ceil(Platten / platesPerPallet); Alternative nur bei ≥ 2 Paletten und nicht voller letzter Palette; Gewicht; pricing nur bei Preis > 0 mit Frachtzone nach längstem PLZ-Präfix; hasPlaceholderData; assumptions auf Deutsch; classify mit Signalwörtern (Miete, mieten, leihen, Sonder, Rabatt, Skonto, dringend, Eilauftrag, Rahmenvertrag, mehrere Baustellen, Zahlungsziel). Mindestens 15 Vitest-Tests.

Baue `apps/api`: Fastify 5, TypeScript ESM, tsx watch, Prisma 6 mit SQLite (`apps/api/data/app.db`, Uploads `data/uploads`, PDFs `data/pdf`), `.env` aus Repo-Root. Pakete: fastify, @fastify/cors, helmet, rate-limit, multipart, cookie, jwt (Cookie `bsa_admin`), prisma, bcryptjs, nodemailer, imapflow, mailparser, pdfkit, @anthropic-ai/sdk, zod, dotenv, vitest. Keine nativen Module mit Build-Tools. Alle Endpunkte der Architektur; Seed mit Produkt „classicXtreme“ (Platzhalterwerte, isPlaceholder=true), vier Frachtzonen, Regeln, Settings (Firma, info@bodenschutz-austria.at, +43 660 7602201), Admin aus .env. KI-Modul (analyzePhoto, draftOffer, draftQuestion, classifyEmail, draftEmailReply, chat) mit Fallback-Vorlagen ohne Schlüssel, disclosure-Text immer. PDF mit pdfkit. Mail mit Protokoll und KI-Fußzeile. IMAP-Worker nur bei gesetztem IMAP_HOST, Auto-Send zentral über `policy.ts`. Sicherheit: helmet, cors, rate-limit je Route, Upload-Prüfung mit Magic Bytes, Login-Sperre. Integrationstests mit `app.inject`, CI-Workflow. Verifikation: db:setup, curl auf alle Routen, Admin-Login mit Cookie, approve-send gegen MailDev mit PDF-Anhang.

## Auftrag 2: Website, Design, Verwaltung

Design zuerst in Claude Design (Desktop 1440, Handy 390), falls verfügbar; sonst im Code. Startseite: eine Aussage im Hero, zwei Handlungen, Vertrauenszeile (40 t, 100 % Recycling, EU), drei Segment-Kacheln, drei Schritte, EIN 3D-/Scroll-Highlight (Platte verlegen, belasten, aufnehmen), Produktkarte mit vier Kennzahlen (Platzhalter), Grundsatz-Hinweise, App-Download, FAQ, Abschluss, Footer mit Betreiberdaten. Motion nur transform/opacity hinter prefers-reduced-motion, Fonts selbst gehostet, LCP < 2,5 s.

Technik: Next.js App Router, Tailwind v4, motion, lucide-react; Rewrites `/api/*` auf die API; Security-Header mit CSP (Nonce), HSTS; `lib/api.ts`; Mock-Modus. Seiten: `/`, `/anfrage` (6 Schritte), `/anfrage/[id]`, KI-Chat-Panel mit Kennzeichnung und KI-Badge, `/app`, `/impressum` (ECG-Pflichtangaben, Betreiberdaten vorbelegt), `/datenschutz` (mit KI-Abschnitt), `/ki-hinweis`, sitemap, robots (KI-Crawler erlaubt, /admin gesperrt), llms.txt. Verwaltung `/admin`: Login, Dashboard mit Auto-Versand-Schalter, Anfragen mit Detail (Foto, Analyse, Mengen, Einstufung, KI-Entwurf, Freigeben und senden, Rückfrage, Ablehnen, PDF), Produkte, Frachtzonen, Regeln, Einstellungen, Posteingang, Protokoll. Build, Typecheck, Lint fehlerfrei.

## Auftrag 3: Expo-App

Expo mit Router, TypeScript; Pakete per `npx expo install` (camera, image-picker, image, file-system, fonts Nunito/Nunito Sans, async-storage, zod). Konfiguration: Name „Bodenschutz Austria“, slug `bodenschutz-austria`, Paket `at.bodenschutzaustria.app`, deutsche Berechtigungstexte, Icon/Splash in Markenfarben, `eas.json` mit development/preview (APK)/production (AAB). Bildschirme: Start, Assistent (Vorhaben, Foto, Maße, Mengen, Kontakt, Senden, Bestätigung), Chat mit KI-Kennzeichnung und Badge, Info. API-Basis aus `EXPO_PUBLIC_API_URL`, Mock-Modus. Prüfung: tsc, expo-doctor, `expo export --platform android`, lint. README mit Expo-Go-Start, LAN-IP, EAS-Schritten für APK und Play-Console-Test.
