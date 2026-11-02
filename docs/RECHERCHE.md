# Recherche: bestehende Seite, Vorbilder, Recht (Stand 2.11.2026)

## Bestehende Seite bodenschutz-austria.at

- WordPress-Template, Startseite trägt noch den Vorlagen-Titel „Mein Blog“. Unterseiten /impressum, /datenschutz, /kontakt, /produkte liefern 404. Shop „launching soon“.
- Betreiber laut Fußzeile: **Ari Schlemmer Handel & Tech-Consulting e.U., Westbahnstr. 21, 3362 Mauer/Amstetten, Tel. +43 660 7602201, info@bodenschutz-austria.at**. UID, Firmenbuchnummer, Gewerbe, Kammer nicht veröffentlicht (für Impressum nachfragen).
- Produkt: „classicXtreme“, Bodenschutzplatten aus 100 % Recycling-Kunststoff, 40+ Tonnen Traglast, hergestellt in der EU, exklusiv für Österreich. Keine Maße, Gewicht, Stärke, Platten je Palette, Preise veröffentlicht.
- Einsatzgebiete: Industrie & Schwerlast („befahrbarer Boden ohne Standzeiten“), Paddock & Reitsport („matschfrei“), Events & Kommunen („Bodenschutz ohne Versiegelung“, Feuerwehrzufahrt, grüner Parkplatz, Event-Weg).
- Schwächen: Template-Reste, leere Landingpages, fehlende Produktdaten, kein Impressum/Datenschutz, KI-Tools ohne Transparenzhinweis, keine Vertrauenssignale.

## Design-Vorbilder und Prinzipien

Vorbilder: securatek.de (Datentiefe: Produktkarten mit Maßen, Gewicht, Traglast), ground-guards.co.uk (Navigation nach Traglast und Problem), q-industrial.com (ruhig + Motion), carmowood.com (Segment-Split, Scroll-Story), drummonds-uk.com (Fotografie + Typografie), karak.at (Reduktion), zeppelin-rental.de (Bedarfsrechner).

Prinzipien:
1. Ein Hero, eine Aussage, zwei Handlungen („Angebot anfragen“, „Fragen stellen“) plus Vertrauenszeile (40 t, Recycling, EU).
2. Segment-Einstieg Industrie / Reitsport / Events & Kommunen als drei große Kacheln.
3. Auswahl nach Problem und Traglast, nicht nur Produktname.
4. Produktkarte = Bild + 4 Kennzahlen (Maße, Gewicht, Traglast, Platten je Palette), Preis ehrlich („auf Anfrage“ oder vorläufig).
5. Ein 3D-/Scroll-Highlight (Platte verlegen → belasten → aufnehmen) statt flächiger Effekte.
6. Scroll-Storytelling in 3 bis 4 Kapiteln, keine Dauer-Parallaxe.
7. Ruhige Basis + eine Signalfarbe, große Headline-Schrift, viel Weißraum.
8. Rechner sichtbar mit Annahmen.
9. Vertrauen früh: Referenzen, EU/Recycling, Traglast.
10. Performance: LCP < 2,5 s, Animationen nur transform/opacity, alles hinter prefers-reduced-motion.

Technik: `motion` (Framer Motion v12) für Reveals und Scroll-Transformationen, CSS Scroll-Driven Animations für einfache Reveals, Lenis optional, React Three Fiber nur für ein Hero-Modell (GLB < 1 MB, dynamic import, Poster-Fallback) oder leichtgewichtig eine CSS-3D-/SVG-Sequenz.

## Recht und Sicherheit

- **EU-KI-Verordnung Art. 50, gilt seit 2.8.2026**: Wer ein KI-Modell per API in einen eigenen Chatbot einbaut, gilt als Anbieter des Chatbot-Systems. Pflicht: Hinweis ab der ersten Interaktion, klar und dauerhaft sichtbar (Startnachricht „Ich bin ein KI-Assistent von Bodenschutz Austria“ plus Badge am Eingabefeld). Nicht ausreichend: AGB, menschlicher Name oder Foto. KI-E-Mails an einzelne Kunden fallen nicht unter die Kennzeichnungspflicht für Inhalte öffentlichen Interesses, trotzdem empfohlen: Fußzeile „Diese Antwort wurde mit KI-Unterstützung erstellt“ und menschliche Freigabe vor Versand.
- **DSGVO**: Rechtsgrundlage Art. 6 Abs. 1 lit. b (vorvertraglich); Datenschutzerklärung mit KI-Abschnitt (Zweck, Empfänger Anthropic, Drittlandtransfer, Speicherdauer); Auftragsverarbeitungsvertrag mit dem KI-Anbieter; Foto-Uploads: EXIF/GPS entfernen, Hinweis „keine Personen fotografieren“, kurze Löschfrist, kein Training.
- **Impressum (e.U., § 5 ECG, § 14 UGB, § 63 GewO, § 25 MedienG)**: Firma, Anschrift, E-Mail, Telefon, Firmenbuchnummer und -gericht, UID, Kammerzugehörigkeit, Gewerbe, Aufsichtsbehörde (BH Amstetten), Unternehmensgegenstand.
- **Cookies (§ 165 Abs. 3 TKG)**: technisch notwendige Cookies ohne Banner. Ohne Tracking kein Banner nötig. Fonts selbst hosten.
- **„PHP“-Richtlinie**: gibt es nicht. Geprüft: NIS2/NISG 2026 (nur mittlere und große Unternehmen, nicht betroffen), Cyber Resilience Act (Produkte mit digitalen Elementen, Website nicht betroffen), P2B (Plattformen, nicht betroffen).
- **Technik-Checkliste**: CSP mit Nonce, HSTS, Security-Header; Rate-Limits auf Chat, Upload, Formular; Upload-Whitelist mit Magic Bytes, EXIF-Strip, Speicherung außerhalb Webroot; Prompt-Injection-Schutz (Kundentexte als Daten einzäunen, keine Schreib-Tools ohne Freigabe); Admin-Login mit bcrypt/Argon2, Brute-Force-Sperre, später 2FA; Secrets nur in Env.

Quellen: Kommission FAQ Art. 50 (digital-strategy.ec.europa.eu), WKO Impressum (wko.at/internetrecht/website-impressum-eu), WKO Cookies FAQ, DSB-FAQ Cookies, Next.js CSP-Leitfaden (nextjs.org/docs/app/guides/content-security-policy), OWASP LLM Top 10 2025.
