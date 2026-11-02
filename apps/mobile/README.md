# Bodenschutz Austria – Handy-App (Expo)

App für Android und iOS: Anfrage-Assistent (Vorhaben → Foto → Maße → Mengen → Kontakt → Senden → Bestätigung), KI-Berater-Chat und Info-Seite. Baut auf dem Vertrag in `docs/ARCHITEKTUR.md` auf und spricht mit `apps/api`.

## Voraussetzungen

- Node 24, npm 11
- Handy mit **Expo Go** (Play Store / App Store), im selben WLAN wie der Rechner
- Für echte Daten: laufende API (`npm run dev:api` im Repo-Root, Port 4000)

Kein Android SDK, kein Xcode nötig. Alles läuft über Expo Go oder EAS Build in der Cloud.

## Start

```bash
cd apps/mobile
npm install
npm start
```

Im Terminal erscheint ein QR-Code. Android: in Expo Go scannen. iPhone: mit der Kamera-App scannen.

### API-Adresse setzen

Die App liest `EXPO_PUBLIC_API_URL` (Standard `http://localhost:4000`). Am Handy ist `localhost` aber das Handy selbst, deshalb die **LAN-IP des Rechners** eintragen. Datei `.env` in `apps/mobile` anlegen (Vorlage `.env.example`):

```
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000
```

Die eigene IP zeigt `ipconfig` (Windows, „IPv4-Adresse“). Nach Änderungen an `.env` den Start mit `npx expo start --clear` wiederholen. Die API muss auf `0.0.0.0` lauschen und CORS für Expo erlauben (siehe `apps/api`).

### Ohne Backend ausprobieren (Mock-Modus)

```
EXPO_PUBLIC_MOCK_API=true
```

Dann liefern Produkte, Berechnung, Fotoanalyse, Anfrage und Chat Beispieldaten aus `src/lib/mock.ts`. Es wird nichts gesendet. Die Startseite zeigt dann „Vorschau-Modus“.

## Skripte

| Befehl | Zweck |
|---|---|
| `npm start` | Metro-Server mit QR-Code |
| `npm run android` / `npm run ios` / `npm run web` | Start mit Zielplattform |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` (ESLint, Flat Config) |
| `npm run make-assets` | Icon, Adaptive Icon, Splash, Favicon neu erzeugen (`scripts/make-assets.js`, nur `pngjs`) |
| `npx expo-doctor` | Abhängigkeiten und Konfiguration prüfen |
| `npx expo export --platform android` | Bundle bauen (Probe, ob alles übersetzt) |

## Struktur

```
app.json               Name, Slug, Scheme, Bundle-IDs, Berechtigungen, Plugins, Splash
eas.json               Build-Profile development / preview / production, Submit-Profil
assets/images/         Icon, Adaptive Icon, Splash, Favicon (generiert)
scripts/make-assets.js PNG-Erzeugung ohne native Abhängigkeiten
src/app/               Expo Router (Dateien = Bildschirme)
  _layout.tsx          Schriften, Splash, Stack mit deutschem „Zurück“, Zustand
  index.tsx            Start
  chat.tsx             KI-Berater
  info.tsx             So funktioniert es, KI-Hinweis, Datenschutz, Version
  anfrage/             vorhaben, foto, masse, mengen, kontakt, senden, bestaetigung
src/components/ui/     Button, Card, Stepper, Input, SelectCard, InfoBanner, DisclosureBanner, Text
src/components/motion/ ExplainerClip (8-s-Erklärschleife), CountUpText, Appear, ScanLine, Confetti, TypingDots
src/components/Screen.tsx  Scroll-Rahmen mit sicheren Rändern und Fußbereich
src/lib/motion.ts      Hook „Bewegung reduzieren“ (AccessibilityInfo)
src/constants/theme.ts Farben, Schriften, Maße
src/context/InquiryContext.tsx  Entwurf der Anfrage (Context + AsyncStorage)
src/lib/api.ts         Typisierter Client (Timeout, deutsche Fehlermeldungen, Mock-Weiche)
src/lib/types.ts       Typen und Zod-Schemas laut Vertrag
src/lib/mock.ts        Beispieldaten
src/lib/format.ts      Zahlen, Euro, Gewichte, Bezeichnungen
```

## Bewegung und Verspieltheit

Umgesetzt mit `react-native-reanimated` (läuft auf dem UI-Thread, nur `transform` und `opacity`) und `react-native-svg`, siehe `docs/DESIGN-RICHTUNG.md`, Abschnitt „Mini-Clips und Verspieltheit“:

- Startbildschirm: Erklärschleife „Foto → Zahlen → Umschlag zu Mario → Freigeben“ (8 s, Code statt Video, pausierbar, stoppt, wenn der Bildschirm nicht sichtbar ist)
- Assistent: Schrittwechsel als Slide, Fortschrittsbalken wächst animiert
- Mengen: Platten, Paletten und Gewicht zählen hoch, Karten erscheinen gestaffelt
- Foto: Scan-Linie über dem Bild, solange die Analyse läuft
- Bestätigung: kurzes Konfetti aus Platten-Rauten
- Chat: Tipp-Indikator mit drei Punkten, Nachrichten gleiten ein, KI-Abzeichen blinkt einmal beim Öffnen
- Buttons: Druck-Feedback (Scale 0,97)

Ist in den Systemeinstellungen „Bewegung reduzieren“ aktiv (`AccessibilityInfo.isReduceMotionEnabled`), entfallen alle Schleifen und Effekte; Zustände bleiben ohne Bewegung sichtbar.

## Builds mit EAS (Cloud, kein lokales SDK)

Einmalig:

```bash
npm i -g eas-cli
eas login            # Expo-Konto (kostenlos anlegen unter expo.dev)
cd apps/mobile
eas init             # verknüpft das Projekt, trägt extra.eas.projectId in app.json ein
```

### Teilbare Android-APK (Testerinnen und Tester)

```bash
eas build -p android --profile preview
```

Nach einigen Minuten gibt es einen Download-Link (auch als QR-Code im Terminal und unter expo.dev). Die APK lässt sich direkt am Android-Gerät installieren („Unbekannte Quellen“ erlauben). Produktions-URL der API vorher in `.env` bzw. per `eas env` setzen, z. B. `EXPO_PUBLIC_API_URL=https://api.bodenschutz-austria.at`.

### Android App Bundle für die Play Console (interner Test)

```bash
eas build -p android --profile production
```

Ergebnis ist eine `.aab`-Datei mit automatisch erhöhter `versionCode`. Schritte in der Play Console:

1. Entwicklerkonto unter play.google.com/console anlegen (einmalige Gebühr).
2. „App erstellen“: Name „Bodenschutz Austria“, Standardsprache Deutsch, App, kostenlos.
3. Links „Testen → Interner Test“ → „Neuen Release erstellen“, die `.aab` hochladen, Release-Notizen eintragen, „Überprüfen und veröffentlichen“.
4. Unter „Tester“ eine E-Mail-Liste anlegen und den Teilnahmelink an die Tester schicken (bis zu 100 Personen, ohne Store-Review).
5. Vor dem Produktions-Release: Store-Eintrag (Beschreibung, Screenshots, Icon 512 px, Feature-Grafik), Datenschutz-URL (`https://bodenschutz-austria.at/datenschutz`), Fragebogen zu Datensicherheit (Kamera/Fotos, Kontaktdaten werden übertragen), Inhaltsbewertung, Zielgruppe.

Automatisches Hochladen: Service-Account-JSON aus der Google Cloud Console als `google-service-account.json` in `apps/mobile` ablegen (steht in `.gitignore`) und `eas submit -p android --profile production` ausführen. Das Submit-Profil in `eas.json` zielt auf den Track `internal`.

### iOS

Benötigt ein Apple-Developer-Konto (99 USD/Jahr). Danach `eas build -p ios --profile production` und `eas submit -p ios` für TestFlight. Ohne Konto bleibt iOS über Expo Go nutzbar.

### Development Build

`eas build -p android --profile development` erzeugt eine App mit Dev-Client, falls später native Module nötig werden, die Expo Go nicht enthält. Für den aktuellen Stand reicht Expo Go.

## Nur am Gerät prüfbar

Kamera, Galerie-Berechtigungen, Foto-Upload (multipart), Splash-Screen, Tastaturverhalten und Schrift-Rendering lassen sich nicht ohne Gerät oder Emulator testen. Alles andere (Typen, Lint, Bundle) ist geprüft.
