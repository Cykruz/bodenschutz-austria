import type { Metadata } from 'next';
import { Bot, Calculator, UserCheck } from 'lucide-react';
import { LegalPage } from '@/components/LegalPage';
import { ClipWege } from '@/components/clips/ClipWege';
import { OPERATOR } from '@/lib/site';

export const metadata: Metadata = {
  title: 'KI-Hinweis',
  description: 'Transparenz: Wo Bodenschutz Austria künstliche Intelligenz einsetzt, was sie nicht entscheidet und warum Mengen und Preise aus festen Regeln kommen.',
  alternates: { canonical: '/ki-hinweis' },
};

export default function KiHinweisPage() {
  return (
    <LegalPage
      eyebrow="Transparenz"
      title="So setzen wir KI ein."
      intro="Kurz gesagt: Die KI hilft beim Einordnen und Formulieren. Mengen und Preise rechnen feste Regeln. Freigeben tut ein Mensch."
    >
      <div className="not-prose mb-10 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Bot, title: 'Die KI hilft', text: 'Sie ordnet ein und formuliert: Was ist auf dem Foto zu sehen? Wie liest sich die Anfrage verständlich?' },
          { icon: Calculator, title: 'Die Regeln rechnen', text: 'Mengen und Preise kommen aus freigegebenen Rechenregeln des Betreibers. Nicht aus einer Schätzung.' },
          { icon: UserCheck, title: 'Der Mensch prüft', text: 'Kein Angebot geht ohne Freigabe raus. Sonderfälle bleiben immer in der persönlichen Prüfung.' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="karte tilt p-5">
            <Icon className="size-8 text-gruen" aria-hidden />
            <h2 className="mt-3 text-xl">{title}</h2>
            <p className="mt-1 text-text">{text}</p>
          </div>
        ))}
      </div>

      <div className="not-prose mb-10">
        <ClipWege caption="Feste Regeln sortieren jede Anfrage: Standardfälle werden automatisch vorbereitet, Prüffälle entscheidet Mario persönlich." />
      </div>

      <h2>Wo KI im Einsatz ist</h2>
      <ul>
        <li>
          <strong>Berater-Chat</strong> („Fragen an den Berater“): Ein KI-Assistent beantwortet Fragen zu Produkten, Einsatzzwecken, Verlegung, Entladung und Ablauf. Er ist
          ab der ersten Nachricht als KI gekennzeichnet und trägt dauerhaft das Zeichen „KI“ am Eingabefeld.
        </li>
        <li>
          <strong>Foto-Einschätzung</strong> im Anfrage-Assistenten: Die KI beschreibt grob, was auf dem Foto zu sehen ist (z. B. Rasen, Schotter, nass). Das ist nur
          eine Orientierung.
        </li>
        <li>
          <strong>Textentwürfe</strong> für Angebote, Rückfragen und E-Mail-Antworten im Verwaltungsbereich. Diese Entwürfe sieht nur der Betreiber; versendet werden
          sie erst nach Prüfung. Versendete Texte tragen den Hinweis „mit KI-Unterstützung erstellt“.
        </li>
        <li>
          <strong>Vorsortierung von E-Mails</strong>: Eingehende Nachrichten werden in Standardfall, Prüffall oder nicht zum Thema eingeordnet, damit nichts übersehen
          wird.
        </li>
      </ul>

      <h2>Was die KI nicht entscheidet</h2>
      <ul>
        <li>Sie nennt keine verbindlichen Preise, Lieferzeiten oder Tragfähigkeitszusagen.</li>
        <li>Sie berechnet keine Mengen und keine Preise. Das machen feste Regeln, die der Betreiber festlegt und freigibt.</li>
        <li>Sie stuft keine Anfrage endgültig ein. Die Einstufung „Standardfall“ oder „Prüffall“ folgt festen Kriterien (z. B. Miete, Fläche, Entladung).</li>
        <li>Sie versendet nichts von allein. Der automatische Versand ist standardmäßig aus und wird nur für klar definierte Standardfälle schrittweise freigegeben.</li>
        <li>Sie trifft keine Entscheidung mit rechtlicher Wirkung für dich.</li>
      </ul>

      <h2>Warum so vorsichtig?</h2>
      <p>
        Unser Grundsatz heißt: <strong>Erst unterstützen, dann automatisieren.</strong> Zuerst liefert das System zuverlässige Entwürfe mit persönlicher Freigabe.
        Erst wenn Standardfälle nachweislich funktionieren, dürfen sie automatisch laufen – und auch das nur nach ausdrücklicher Freigabe im Verwaltungsbereich.
      </p>

      <h2>Gut zu wissen</h2>
      <ul>
        <li>Eine Anfrage ist noch keine Bestellung.</li>
        <li>Ein Foto ersetzt keine Vermessung und keine Prüfung der Tragfähigkeit.</li>
        <li>Verlässliche Preise und Versandkosten gibt es erst mit vollständigen, freigegebenen Daten.</li>
      </ul>

      <h2>Rechtlicher Rahmen und Technik</h2>
      <p>
        Die Kennzeichnung folgt Art. 50 der EU-KI-Verordnung (gültig seit 2. August 2026). Als KI-Modell setzen wir Sprachmodelle von Anthropic über eine Schnittstelle
        ein; Details zur Datenverarbeitung stehen in der <a href="/datenschutz">Datenschutzerklärung</a>. Kundentexte werden dem Modell ausschließlich als Daten
        übergeben, nicht als Anweisungen; KI-Antworten werden nie als Befehle ausgeführt.
      </p>

      <h2>Fragen dazu?</h2>
      <p>
        Schreib an <a href={OPERATOR.emailHref}>{OPERATOR.email}</a> oder ruf an: <a href={OPERATOR.phoneHref}>{OPERATOR.phone}</a>. Da antwortet ein Mensch.
      </p>
    </LegalPage>
  );
}
