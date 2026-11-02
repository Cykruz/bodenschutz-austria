import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { OPERATOR } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Wie bodenschutz-austria.at personenbezogene Daten bei Anfragen, Foto-Uploads und im KI-Berater verarbeitet. Keine Tracking-Cookies.',
  alternates: { canonical: '/datenschutz' },
};

export default function DatenschutzPage() {
  return (
    <LegalPage
      eyebrow="Rechtliches"
      title="Datenschutzerklärung"
      intro="Wir verarbeiten nur die Daten, die für dein Angebot nötig sind. Kein Tracking, keine Werbe-Cookies, Schriften werden selbst gehostet. Stand: November 2026."
    >
      <h2>1. Verantwortlicher</h2>
      <p>
        {OPERATOR.company}, {OPERATOR.street}, {OPERATOR.postalCode} {OPERATOR.city}, {OPERATOR.country}
        <br />
        Telefon <a href={OPERATOR.phoneHref}>{OPERATOR.phone}</a>, E-Mail <a href={OPERATOR.emailHref}>{OPERATOR.email}</a>
      </p>

      <h2>2. Welche Daten wir wofür verarbeiten</h2>

      <h3>2.1 Aufruf der Website</h3>
      <p>
        Beim Aufruf werden technisch notwendige Daten verarbeitet (IP-Adresse, Zeitpunkt, aufgerufene Seite, Browsertyp), um die Website auszuliefern und abzusichern
        (z. B. Begrenzung der Anfragen je Adresse). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren Betrieb). Serverprotokolle
        werden nach spätestens 14 Tagen gelöscht.
      </p>

      <h3>2.2 Anfrage-Assistent (Angebotsanfrage)</h3>
      <p>
        Im Assistenten gibst du Vorhaben, Maße, Produktwunsch, Name, E-Mail, optional Telefon und Straße, PLZ, Ort, Entlademöglichkeit, Anmerkungen und den Wunsch
        nach Miete an. Wir verwenden diese Angaben, um Mengen zu berechnen, ein Angebot zu erstellen, Rückfragen zu stellen und die Lieferung vorzubereiten.
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen auf deine Anfrage). Ohne Name, E-Mail, PLZ und Ort können wir kein Angebot erstellen.
      </p>

      <h3>2.3 Foto-Upload</h3>
      <p>
        Du kannst freiwillig ein Foto des Untergrunds hochladen. Bitte fotografiere nur den Boden, keine Personen und keine Kennzeichen. Ortsdaten (EXIF/GPS) werden
        beim Upload entfernt. Das Foto wird mit KI-Unterstützung grob eingeordnet (siehe Punkt 3) und zusammen mit deiner Anfrage gespeichert, damit wir es bei der
        Prüfung ansehen können. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Fotos werden nicht zum Training von KI-Modellen verwendet.
      </p>

      <h3>2.4 Berater-Chat</h3>
      <p>
        Im Chat kannst du Fragen zu Produkten, Einsatz, Lieferung und Ablauf stellen. Deine Nachrichten werden einer Chat-Sitzung zugeordnet (zufällige Sitzungs-ID
        im Sitzungsspeicher deines Browsers, gelöscht beim Schließen des Tabs) und zur Beantwortung an unseren KI-Dienstleister übermittelt (Punkt 3). Bitte gib im
        Chat keine sensiblen Daten und keine Daten Dritter ein. Rechtsgrundlage: Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO (Beantwortung deiner Fragen, Verbesserung des
        Beratungsangebots).
      </p>

      <h3>2.5 E-Mail-Kontakt</h3>
      <p>
        Wenn du uns eine E-Mail schreibst, verarbeiten wir deine Angaben zur Bearbeitung. Eingehende E-Mails können mit KI-Unterstützung vorsortiert und mit einem
        Antwortentwurf versehen werden, den ein Mensch prüft, bevor er versendet wird. Rechtsgrundlage: Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO.
      </p>

      <h2>3. Einsatz von künstlicher Intelligenz</h2>
      <p>
        Für den Berater-Chat, die Einordnung von Fotos sowie für Textentwürfe (Angebotstexte, Rückfragen, E-Mail-Antworten) setzen wir Sprachmodelle von{' '}
        <strong>Anthropic</strong> (Anthropic PBC, San Francisco, USA, bzw. Anthropic Ireland Ltd.) als Auftragsverarbeiter ein. Übermittelt werden nur die für die
        jeweilige Funktion nötigen Inhalte: deine Chat-Nachrichten, das hochgeladene Foto sowie die Angaben deiner Anfrage für den Textentwurf.
      </p>
      <ul>
        <li>
          <strong>Was die KI tut:</strong> Sie ordnet ein und formuliert. Mengen, Preise und die Einstufung einer Anfrage kommen aus festen Rechenregeln, nicht aus der
          KI.
        </li>
        <li>
          <strong>Was die KI nicht tut:</strong> Sie trifft keine Entscheidung mit rechtlicher Wirkung für dich. Jedes Angebot wird von einem Menschen geprüft und
          freigegeben.
        </li>
        <li>
          <strong>Drittlandtransfer:</strong> Die Verarbeitung kann in den USA erfolgen. Grundlage sind der Angemessenheitsbeschluss der EU-Kommission für das
          EU-US Data Privacy Framework (soweit der Anbieter zertifiziert ist) sowie Standardvertragsklauseln nach Art. 46 Abs. 2 lit. c DSGVO.
        </li>
        <li>
          <strong>Kein Training:</strong> Nach den Vertragsbedingungen des Anbieters werden über die Schnittstelle übermittelte Inhalte nicht zum Training der Modelle
          verwendet.
        </li>
        <li>
          <strong>Kennzeichnung:</strong> Jede KI-Interaktion ist als solche gekennzeichnet (EU-KI-Verordnung Art. 50). Mehr unter <a href="/ki-hinweis">KI-Hinweis</a>.
        </li>
      </ul>

      <h2>4. Empfänger</h2>
      <p>
        Hosting-Dienstleister (Betrieb der Website und Datenbank im Auftrag), E-Mail-Dienstleister (Versand und Empfang), Anthropic (KI, Punkt 3), Speditionen
        (nur Lieferadresse und Kontakt, sobald ein Auftrag erteilt wird). Eine Weitergabe zu Werbezwecken findet nicht statt.
      </p>

      <h2>5. Speicherdauer</h2>
      <ul>
        <li>Anfragen und Angebote: bis zum Abschluss der Bearbeitung, danach im Rahmen gesetzlicher Aufbewahrungspflichten (7 Jahre nach § 132 BAO, soweit Geschäftsunterlagen).</li>
        <li>Fotos: Löschung spätestens 90 Tage nach Abschluss der Anfrage, sofern kein Auftrag zustande kommt.</li>
        <li>Chat-Verläufe: 30 Tage, danach anonymisierte Löschung.</li>
        <li>Serverprotokolle: 14 Tage.</li>
      </ul>

      <h2>6. Cookies und lokale Speicherung</h2>
      <p>
        Die öffentliche Website setzt keine Tracking- oder Werbe-Cookies und keine Analyse-Werkzeuge; ein Cookie-Banner ist deshalb nicht erforderlich (§ 165 Abs. 3
        TKG 2021). Verwendet werden nur technisch notwendige Speicher: die Sitzungs-ID des Chats im Sitzungsspeicher deines Browsers und ein Anmelde-Cookie für den
        geschützten Verwaltungsbereich der Betreiber. Schriften werden von unserem Server geladen, nicht von Google.
      </p>

      <h2>7. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch
        (Art. 21 DSGVO). Wende dich dafür an <a href={OPERATOR.emailHref}>{OPERATOR.email}</a>. Außerdem kannst du dich bei der österreichischen Datenschutzbehörde
        beschweren: Barichgasse 40–42, 1030 Wien,{' '}
        <a href="https://www.dsb.gv.at" rel="noopener" target="_blank">
          dsb.gv.at
        </a>
        .
      </p>

      <h2>8. Sicherheit</h2>
      <p>
        Die Übertragung erfolgt verschlüsselt (TLS). Uploads werden auf Dateityp und Größe geprüft und außerhalb des öffentlichen Webbereichs gespeichert. Der
        Verwaltungsbereich ist passwortgeschützt, Zugriffe werden begrenzt und protokolliert.
      </p>

      <h2>9. Änderungen</h2>
      <p>Wir passen diese Erklärung an, wenn sich Funktionen oder Rechtslage ändern. Es gilt die jeweils hier veröffentlichte Fassung.</p>
    </LegalPage>
  );
}
