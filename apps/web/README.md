# Website `apps/web`

Öffentliche Website von Bodenschutz Austria (Startseite, Anfrage-Assistent, KI-Chat, Rechtsseiten) und Verwaltung unter `/admin`. Next.js 16 (App Router), Tailwind v4, `motion`, `lenis`, React Three Fiber.

## Entwicklung

Voraussetzung: die API läuft auf Port 4000 (siehe Haupt-README, `npm run dev` im Repo-Root startet API, Website und MailDev zusammen).

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # Produktions-Build (output: standalone)
npm run start      # gebauten Server starten
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

Umgebungsvariablen (Vorlage `.env.example`, Kopie als `.env.local`):

| Variable | Bedeutung |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Öffentliche Adresse (Canonical, Sitemap, OpenGraph, JSON-LD) |
| `API_INTERNAL_URL` | Adresse der API für die Weiterleitung `/api/*` (serverseitig, wird beim Build eingebacken) |
| `NEXT_PUBLIC_MOCK_API` | `true` = Beispieldaten statt API (Vorführung ohne Backend) |
| `NEXT_PUBLIC_ANDROID_APK_URL` | Direkter APK-Link für `/app` und die Startseite (leer = Platzhalter) |

## Aufbau

- `app/(site)/` öffentliche Seiten: `/`, `/anfrage`, `/anfrage/[id]`, `/app`, `/impressum`, `/datenschutz`, `/ki-hinweis`
- `app/admin/` Verwaltung mit eigenem Layout (Login, Übersicht, Anfragen, Posteingang, Produkte, Frachtzonen, Regeln, Einstellungen, Protokoll)
- `components/home/` Kapitel der Startseite (Preloader, Hero mit 3D-Bühne, Manifest, gepinnte Sequenz, Einsätze, Produkt, Ablauf, kinetische Typografie, App, FAQ, Aufruf)
- `components/three/` prozedurale Platten-Szenen (kein externes Modell), nur per `dynamic import` ohne SSR geladen
- `components/clips/` Mini-Clips als CSS/SVG-Schleifen (`ClipAblauf`, `ClipPlatte`, `ClipWege`), 1:1 nach `docs/design/Clip-*.dc.html`
- `lib/api.ts` typisierter API-Client (same-origin `/api/*`, Cookies), `lib/server-api.ts` serverseitiger Zugriff mit Platzhalter-Fallback
- `proxy.ts` setzt die Content-Security-Policy mit Nonce je Anfrage; weitere Security-Header in `next.config.ts`

## Grundsätze im Code

- Alle Bewegung nur über `transform`/`opacity` und hinter `prefers-reduced-motion`; 3D nur mit WebGL und auf ausreichend starken Geräten, sonst Poster/Clip.
- Texte bleiben echtes HTML (SEO, KI-Crawler); `robots.ts`, `sitemap.ts`, `public/llms.txt`.
- Mengen, Preise und Einstufung kommen immer von der API (Regel-Engine). Die Website rechnet nichts selbst.
- Platzhalterdaten werden als solche angezeigt (eckige Klammern, Hinweis „von Mario zu bestätigen“).
