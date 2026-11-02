# Design-Richtung Website (Vorbild lusion.co)

Der Nutzer hat lusion.co als Vorbild für den Aufbau der Website genannt. Diese Datei übersetzt das Vorbild in konkrete Vorgaben für `apps/web`. Der Design-Canvas mit Desktop- und Handy-Entwurf liegt unter https://claude.ai/artifact/73uh28mMKoBsJ6kiUiVzTz (Farben, Texte, Abschnitte); die Bewegung und das 3D kommen aus dieser Datei.

## Was lusion.co ausmacht

1. **Preloader mit Zähler** (000 bis 100) auf schwarzem Grund, dann weiches Aufdecken der Szene.
2. **Eine WebGL-Szene als Bühne**: organische 3D-Form, reagiert auf Mausbewegung und Scrollen, läuft hinter dem Text weiter. Der Text liegt darüber, nicht daneben.
3. **Ein Satz als Hero**: „We create 3D visual storytelling …“, darunter „SCROLL TO EXPLORE“. Kein Bild, kein Formular, keine drei Spalten.
4. **Smooth Scroll** (Lenis-artig), Scroll-Fortschritt treibt Kamera, Form und Text an.
5. **Typografie in Bewegung**: Überschriften werden zeichenweise aufgedeckt (Split-Text), Zeilen schieben sich beim Scrollen hoch, große kinetische Wortblöcke („STEP INTO A NEW WORLD“).
6. **Horizontale Projektliste** mit Hover-Verzerrung, Kategorien als Kapitälchen-Zeile.
7. **Kapitel statt Sektionen**: Hero, Manifest, Arbeiten, Haltung, Aufruf, Footer; jeder Übergang ist animiert, nichts springt.
8. **Dunkler Grund, wenige Farben, viel Weißraum, riesige Schrift**; Menü klein oben, Call-to-Action „LET’S TALK“ als Pille.
9. **Ende der Seite leitet weiter** („KEEP SCROLLING TO LEARN MORE → NEXT PAGE“).

## Übersetzung für Bodenschutz Austria

Markenfarben bleiben: Grund Dunkelgrün `#1E3A2F` (statt Schwarz), Text Sand `#F6F3EC`, Akzent Terracotta `#D97B2A` und `#F0A85A`. Helle Kapitel in Sand/Salbei für Lesbarkeit (Produktdaten, FAQ, Recht).

Kapitel der Startseite (Scroll-Reihenfolge):

1. **Preloader**: Zähler 000–100 in Nunito 900, Hintergrund Dunkelgrün, blendet in die 3D-Szene über. Bei `prefers-reduced-motion` entfällt er.
2. **Hero mit 3D-Bühne**: React Three Fiber, prozedural erzeugte Bodenschutzplatte (abgerundeter Quader mit Rastermuster, 240×120 Einheiten verhältnisgetreu) in mehreren Exemplaren, die sich beim Scrollen von einem losen Stapel zu einer verlegten Fläche ordnen. Maus bewegt Kamera leicht (Parallaxe). Text darüber: „Fester Boden. Genau dort, wo du ihn brauchst.“ + „Scrollen zum Entdecken“. Zwei Pillen: „Angebot anfragen“, „Fragen stellen“. Vertrauenszeile klein darunter.
3. **Manifest**: ein großer Absatz, zeilenweise beim Scrollen aufgedeckt: „Wir machen Boden befahrbar. In Stunden, nicht Wochen. Ohne Versiegelung, ohne Spuren.“
4. **Verlegen · Belasten · Aufnehmen**: gepinnte Sequenz (Scroll-Scrub): die 3D-Platten legen sich (1), ein stilisierter LKW-Block fährt auf, Platten drücken minimal ein (2), Platten heben ab und der Rasen darunter bleibt grün (3). Je Phase eine Überschrift links, Zahl 01/02/03 groß.
5. **Einsätze**: horizontale Reihe (Scroll-Scrub oder Drag) mit drei Karten Industrie & Schwerlast, Paddock & Reitsport, Events & Kommunen, Hover mit leichter Verzerrung/Zoom, Kapitälchen-Zeile darüber wie „BAUSTELLE • KRAN • ZUFAHRT“.
6. **Produkt classicXtreme**: helles Kapitel (Sand), Platte als drehbares 3D-Objekt (gleiche Geometrie, Drag zum Drehen), vier Kennzahlen, Datenblatt, „Preis anfragen“. Platzhalterwerte markiert.
7. **Vom Foto zum Angebot**: drei Schritte, Zahl groß, Text kurz; Handy-Mockup mit dem Assistenten.
8. **Kinetische Typo**: „EINE ANFRAGE IST NOCH KEINE BESTELLUNG“ in riesigen Zeilen, Terracotta-Kapitel, darunter die zwei Hinweise.
9. **Aufruf**: „Bereit? Dein Angebot in drei Minuten.“ mit Pille, Telefon.
10. **Footer** mit Betreiberdaten, Rechtliches, KI-Hinweis, „Weiter scrollen: Anfrage starten“ als Übergang zu `/anfrage`.

## Technik

- `motion` (Framer Motion v12) für Split-Text, Reveals, Scroll-Transformationen; `lenis` für Smooth Scroll, mit `useReducedMotion` deaktiviert.
- `@react-three/fiber` + `@react-three/drei` + `three` für die Platten-Szene: prozedurale Geometrie (RoundedBox + Instanzen), kein externes Modell, `frameloop="demand"` außerhalb der Sichtbarkeit, `dynamic import` ohne SSR, Poster-Fallback (statisches SVG aus dem Design-Canvas) für reduced-motion, schwache Geräte und während des Ladens.
- Scroll-Scrub über `useScroll` (motion) oder GSAP ScrollTrigger nur für das gepinnte Kapitel 4.
- Alle Texte bleiben echtes HTML (SEO, KI-Crawler): Split-Text nur visuell per `aria-hidden` Duplikat, Original für Screenreader.
- Performance-Budget: LCP unter 2,5 s (Hero-Text rendert vor der 3D-Szene), 3D-Bundle lazy, maximal ~300 KB zusätzliches JS für three.
- Barrierefreiheit: Fokus-Reihenfolge, Tastatur, Kontrast 4.5:1, Bewegung komplett abschaltbar.
