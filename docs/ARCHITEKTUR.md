# Architektur und Schnittstellen

Verbindliche Grundlage für alle Teile des Monorepos. Wer ein Paket baut, hält sich an diese Verträge, damit App, Website und Backend zusammenpassen.

## Überblick

```
bodenschutz-austria/
  packages/rules      Regel-Engine (reine Funktionen, keine Abhängigkeiten) – Mengen, Preise, Einstufung
  apps/api            Fastify + Prisma (SQLite) – Daten, KI, PDF, E-Mail (SMTP/IMAP), Admin-Auth
  apps/web            Next.js – öffentliche Website (Homepage, Anfrage-Assistent, KI-Chat) + /admin Verwaltung
  apps/mobile         Expo (React Native) – App für Android und iOS
  docs/               Konzept, Architektur, Anleitungen
```

Werkzeuge: Node 24, npm (kein pnpm, KEINE npm-workspaces: jedes Paket hat seine eigene `package.json` und eigene `node_modules`; `apps/api` bindet die Regel-Engine als `"@bodenschutz/rules": "file:../../packages/rules"` ein, die vorher gebaut sein muss), TypeScript strict, Vitest. Root-Skript `npm run setup` installiert alles der Reihe nach. Kein Docker nötig: Datenbank ist SQLite (Datei `apps/api/data/app.db`), Test-Mailserver ist MailDev (`npx maildev`, SMTP 1025, Web-UI 1080).

Ports lokal: API `http://localhost:4000`, Web `http://localhost:3000`, MailDev `http://localhost:1080`.

Grundsätze (aus dem Konzept, überall sichtbar umsetzen):
- Die KI ordnet ein und formuliert. Mengen, Preise und Einstufung kommen NUR aus `packages/rules`.
- Eine Anfrage ist noch keine Bestellung. Ein Foto ersetzt keine Vermessung und keine Prüfung der Tragfähigkeit.
- Nichts geht automatisch raus, solange `autoSendEnabled=false` (Standard). Prüffälle gehen immer an den Menschen.
- Jede KI-Interaktion wird als KI gekennzeichnet (EU-KI-Verordnung Art. 50).
- Platzhalterdaten tragen `isPlaceholder=true` und werden in der Verwaltung als „Platzhalter, von Mario zu bestätigen“ angezeigt.

## Farben und Schrift

Dunkelgrün `#1E3A2F`, Sand `#F6F3EC`, Salbei `#E6EDE3`, Terracotta `#D97B2A` (als Text `#B9621C`), Akzent auf Dunkel `#F0A85A`, Textgrau `#44524A`. Schrift: Nunito (Überschriften, 800), Nunito Sans (Text). Große Bedienelemente, Kontrast mindestens 4.5:1.

## packages/rules

```ts
export type ProjectType = 'CONSTRUCTION' | 'EVENT' | 'PADDOCK';
export type MeasureMode = 'AREA' | 'LANES';
export type Unloading = 'FORKLIFT' | 'CRANE_NEEDED' | 'UNKNOWN';

export interface ProductSpec {
  id: string; name: string;
  lengthCm: number; widthCm: number; thicknessMm: number; weightKg: number;
  platesPerPallet: number; pricePerPlateCents: number; loadCapacityTons: number;
  isPlaceholder: boolean;
}
export interface FreightZoneSpec {
  id: string; name: string; postalPrefixes: string[]; // z. B. ['1','2'] für PLZ 1xxx, 2xxx
  pricePerPalletCents: number; minimumCents: number; isPlaceholder: boolean;
}
export interface CalculationInput {
  projectType: ProjectType; mode: MeasureMode;
  areaM2?: number;                       // bei AREA
  lengthM?: number; laneWidthM?: number; laneCount?: number; // bei LANES (Standard laneWidthM 1.0 … Plattenbreite, laneCount 2)
  wasteFactor?: number;                  // Standard 1.05 (5 % Verschnitt/Überlappung)
  postalCode?: string;                   // für Frachtzone
}
export interface CalculationResult {
  areaM2: number;                 // effektive Fläche
  plates: number;                 // aufgerundet inkl. wasteFactor
  pallets: number;                // aufgerundet
  weightKg: number;
  alternative?: { pallets: number; plates: number; coveredAreaM2: number; note: string }; // nur wenn pallets > 1 und nicht ganzzahlig voll
  pricing?: {
    platesCents: number; freightCents: number; totalCents: number;
    isPreliminary: true; hasPlaceholderData: boolean; freightZone?: string;
  };
  assumptions: string[];          // Klartext, z. B. „5 % Verschnitt eingerechnet“
}
export function calculate(input: CalculationInput, product: ProductSpec, zones?: FreightZoneSpec[]): CalculationResult;

export interface ClassificationInput {
  calculation: CalculationResult;
  unloading: Unloading;
  notes?: string;                // Freitext des Kunden
  rentalRequested?: boolean;
  hasPhoto: boolean;
  contactComplete: boolean;      // Name, E-Mail, PLZ/Ort vorhanden
  hasFreightZone: boolean;
}
export interface ClassificationThresholds { maxStandardAreaM2: number; /* Standard 500 */ maxStandardPallets: number; /* Standard 10 */ }
export interface ClassificationResult { classification: 'STANDARD' | 'REVIEW'; reasons: string[] }
export function classify(input: ClassificationInput, t?: ClassificationThresholds): ClassificationResult;
// REVIEW-Gründe: Miete, fehlende Kontaktdaten, Entladung unklar oder Kran nötig, Fläche/Paletten über Grenzwert,
// keine Frachtzone, Freitext enthält Sonderwunsch-Signale (z. B. „Sonder“, „Rabatt“, „Miete“, „dringend“, „Angebot für mehrere“).
```

Alle Funktionen sind rein und deterministisch. Vitest-Tests decken Fläche, Fahrspuren, Alternative, Preise mit/ohne Zone, Platzhalter-Flag, jede REVIEW-Regel ab.

## apps/api – Datenmodell (Prisma, SQLite)

- `Product`: id, slug, name, description, lengthCm, widthCm, thicknessMm, weightKg, platesPerPallet, pricePerPlateCents, loadCapacityTons, material, isPlaceholder, active, sortOrder
- `FreightZone`: id, name, postalPrefixes (String, kommagetrennt), pricePerPalletCents, minimumCents, isPlaceholder
- `Inquiry`: id (cuid), createdAt, updatedAt, channel (`APP`|`WEB`|`EMAIL`), status (`NEW`|`DRAFT`|`QUESTION`|`APPROVED`|`SENT`|`REJECTED`), projectType, mode, areaM2?, lengthM?, laneWidthM?, laneCount?, productId, photoPath?, photoAnalysis (JSON-String)?, calculation (JSON-String), classification (`STANDARD`|`REVIEW`), reviewReasons (JSON-String), customerName, email, phone?, street?, postalCode, city, unloading, notes?, rentalRequested (Bool), aiDraft?, adminNotes?, offerPdfPath?, sentAt?, aiDisclosureShown (Bool)
- `EmailMessage`: id, direction (`IN`|`OUT`), messageId?, fromAddress, toAddress, subject, textBody, receivedAt, category (`STANDARD`|`REVIEW`|`UNRELATED`|null), aiDraft?, status (`NEW`|`DRAFT`|`SENT`|`IGNORED`), inquiryId?, autoSent (Bool), inReplyToId?
- `ApprovalRule`: key (PK), label, description, autoAllowed (Bool). Seed-Keys: `inquiry_confirmation` (Eingangsbestätigung an Kunden), `standard_offer_send` (Angebotsentwurf für Standardfall automatisch senden), `standard_email_reply` (Standard-E-Mail automatisch beantworten). Alle Seed-Werte `false`.
- `Setting`: key (PK), value. Keys: `autoSendEnabled` (`"false"`), `maxStandardAreaM2` (`"500"`), `maxStandardPallets` (`"10"`), `wasteFactor` (`"1.05"`), `companyName`, `companyEmail`, `companyPhone`
- `AdminUser`: id, email, passwordHash (bcryptjs), createdAt
- `ChatSession`: id, channel, createdAt; `ChatMessage`: id, sessionId, role, content, createdAt

Seed: 2 Produkte (Platzhalter), 4 Frachtzonen Österreich (Platzhalter), Regeln, Settings, Admin aus `.env`.

## apps/api – HTTP-Schnittstelle (Präfix `/api`)

Öffentlich:
- `GET /api/health` → `{ ok: true }`
- `GET /api/products` → `ProductSpec[]` (nur aktive, inkl. description, material)
- `POST /api/calculate` Body `CalculationInput & { productId: string }` → `CalculationResult`
- `POST /api/photo/analyze` multipart Feld `photo` (jpeg/png/webp, max 8 MB) → `{ photoId, surface, suitability: 'GOOD'|'LIMITED'|'UNCLEAR', notes, confidence: 0..1, isOrientationOnly: true, disclosure: string }`
- `POST /api/inquiries` Body `{ projectType, mode, areaM2?, lengthM?, laneWidthM?, laneCount?, productId, photoId?, customerName, email, phone?, street?, postalCode, city, unloading, notes?, rentalRequested?, channel: 'APP'|'WEB' }` → `{ id, status, classification, reviewReasons, calculation, message }`. Nebenwirkungen: Anfrage speichern, KI-Entwurf erzeugen (Angebotstext bzw. Rückfrage), Eingangsbestätigung an Kunden nur senden, wenn Regel `inquiry_confirmation` auto erlaubt UND `autoSendEnabled`, sonst nur speichern.
- `GET /api/inquiries/:id/public` → `{ id, status, createdAt }` (Status für Kunden)
- `POST /api/chat` Body `{ sessionId?, channel: 'APP'|'WEB', messages: [{ role: 'user'|'assistant', content }], context?: { projectType?, calculation? } }` → `{ sessionId, reply, disclosure }`. System-Prompt enthält Produkte aus DB, FAQ, Grundsätze; Modell `claude-sonnet-5-5`.

Admin (Cookie-Session, `@fastify/secure-session` oder signiertes Cookie; alle unter `/api/admin`, 401 ohne Login):
- `POST /login { email, password }`, `POST /logout`, `GET /me`
- `GET /inquiries?status=&q=`, `GET /inquiries/:id`, `PATCH /inquiries/:id { status?, adminNotes?, aiDraft? }`
- `POST /inquiries/:id/approve-send` → erzeugt Angebots-PDF (pdfkit), sendet per SMTP mit PDF-Anhang und `aiDraft` als Text, setzt `SENT`, protokolliert `EmailMessage` OUT
- `POST /inquiries/:id/question { text }` → sendet Rückfrage, Status `QUESTION`
- `POST /inquiries/:id/reject { reason? }`
- `POST /inquiries/:id/regenerate-draft` → KI-Entwurf neu
- `GET /inquiries/:id/photo` → Bilddatei; `GET /inquiries/:id/pdf` → PDF-Vorschau (erzeugt bei Bedarf)
- `GET|POST /products`, `PUT|DELETE /products/:id`; `GET|POST /freight-zones`, `PUT|DELETE /freight-zones/:id`
- `GET /rules`, `PUT /rules/:key { autoAllowed }`; `GET /settings`, `PUT /settings { key: value, … }`
- `GET /emails?status=`, `GET /emails/:id`, `POST /emails/:id/send { text? }` (sendet Entwurf oder überschriebenen Text), `POST /emails/:id/ignore`, `POST /emails/:id/regenerate-draft`
- `GET /stats` → Zähler je Status für das Dashboard

Postfach-Worker (im API-Prozess, alle `IMAP_POLL_SECONDS`, Standard 60, nur aktiv wenn `IMAP_HOST` gesetzt): neue Mails lesen (imapflow, UNSEEN), speichern, per KI einordnen (`STANDARD`|`REVIEW`|`UNRELATED`) und Entwurf erzeugen, automatisch senden nur wenn `autoSendEnabled` UND Regel `standard_email_reply` UND Kategorie `STANDARD`; sonst Status `DRAFT`. Eigene gesendete Mails nie beantworten (Absender = eigene Adresse ignorieren).

Sicherheit: `@fastify/helmet`, `@fastify/cors` (nur `PUBLIC_WEB_URL` und Expo-Dev), `@fastify/rate-limit` (Chat 20/min, Foto 10/min, Anfragen 5/min je IP), Upload-Validierung (MIME + Magic Bytes, Größe), Secrets nur aus `.env`, Prompt-Injection: Kundentexte im Prompt klar als Daten markieren, KI-Antworten nie als Befehle ausführen.

## Umgebungsvariablen (`.env` im Repo-Root, Vorlage `.env.example`)

```
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-5-5
DATABASE_URL=file:./data/app.db
API_PORT=4000
PUBLIC_WEB_URL=http://localhost:3000
PUBLIC_API_URL=http://localhost:4000
SESSION_SECRET=bitte-32-zeichen-zufall
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=bitte-aendern
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
MAIL_FROM="Bodenschutz Austria <office@bodenschutz-austria.at>"
IMAP_HOST=
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=
IMAP_PASS=
IMAP_POLL_SECONDS=60
```

Web liest `NEXT_PUBLIC_API_URL`, Mobile liest `EXPO_PUBLIC_API_URL`.

## KI-Berater (Chat) – Verhaltensregeln im System-Prompt

Kurz, einfach, auf Deutsch, Du- oder Sie-Form je nach Kunde. Darf: Produkte, Einsatzzwecke, Verlegung, Entladung, Ablauf, Lieferung „nach Prüfung“ erklären; auf den Rechner verweisen. Darf nicht: verbindliche Preise, Lieferzeiten oder Tragfähigkeitszusagen geben; Themen außerhalb Bodenschutzplatten bearbeiten (höflich zurück zum Thema); Rabatte oder Verträge zusagen. Bei Sonderfällen: „Das prüft Mario persönlich, bitte Anfrage senden.“ Erste Antwort jeder Sitzung enthält den Hinweis, dass ein KI-Assistent antwortet.
