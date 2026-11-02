import type { Metadata } from 'next';
import { LegalPage, Platzhalter } from '@/components/LegalPage';
import { Notice } from '@/components/ui/Notice';
import { OPERATOR, PLACEHOLDER } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Impressum und Offenlegung von bodenschutz-austria.at nach § 5 ECG, § 14 UGB, § 63 GewO und § 25 MedienG.',
  alternates: { canonical: '/impressum' },
};

export default function ImpressumPage() {
  return (
    <LegalPage eyebrow="Rechtliches" title="Impressum" intro="Informationspflicht nach § 5 ECG, § 14 UGB, § 63 GewO und Offenlegung nach § 25 MedienG.">
      <Notice tone="warn" title="Platzhalter werden vor dem Livebetrieb ergänzt.">
        Markierte Angaben liegen noch nicht vor und werden mit dem Betreiber abgestimmt (UID, Firmenbuch, Kammer, Gewerbe, Behörde).
      </Notice>

      <h2>Medieninhaber und Diensteanbieter</h2>
      <p>
        <strong>{OPERATOR.company}</strong>
        <br />
        Inhaber: {OPERATOR.owner}
        <br />
        {OPERATOR.street}
        <br />
        {OPERATOR.postalCode} {OPERATOR.city}, {OPERATOR.country}
      </p>
      <p>
        Telefon: <a href={OPERATOR.phoneHref}>{OPERATOR.phone}</a>
        <br />
        E-Mail: <a href={OPERATOR.emailHref}>{OPERATOR.email}</a>
        <br />
        Website: <a href={OPERATOR.website}>bodenschutz-austria.at</a>
      </p>

      <h2>Unternehmensangaben</h2>
      <ul>
        <li>
          Rechtsform: eingetragenes Einzelunternehmen (e.U.)
        </li>
        <li>
          Unternehmensgegenstand: Handel mit Bodenschutzplatten und Zubehör, Technologieberatung
        </li>
        <li>
          Firmenbuchnummer: <Platzhalter>{PLACEHOLDER.firmenbuch}</Platzhalter>
        </li>
        <li>
          Firmenbuchgericht: <Platzhalter>{PLACEHOLDER.gericht}</Platzhalter>
        </li>
        <li>
          UID-Nummer: <Platzhalter>{PLACEHOLDER.uid}</Platzhalter>
        </li>
        <li>
          Gewerbe: <Platzhalter>{PLACEHOLDER.gewerbe}</Platzhalter>
        </li>
        <li>
          Kammerzugehörigkeit: <Platzhalter>{PLACEHOLDER.kammer}</Platzhalter>
        </li>
        <li>
          Aufsichtsbehörde / Gewerbebehörde: <Platzhalter>{PLACEHOLDER.aufsicht}</Platzhalter>
        </li>
        <li>
          Anwendbare Rechtsvorschriften: Gewerbeordnung 1994 (GewO), abrufbar unter{' '}
          <a href="https://www.ris.bka.gv.at" rel="noopener" target="_blank">
            ris.bka.gv.at
          </a>
        </li>
      </ul>

      <h2>Offenlegung nach § 25 MedienG</h2>
      <p>
        Grundlegende Richtung der Website: Information über Bodenschutzplatten, Einsatzbereiche und Bezugsmöglichkeiten sowie Online-Anfrage für Angebote von{' '}
        {OPERATOR.company}.
      </p>

      <h2>Online-Streitbeilegung und Verbraucherschlichtung</h2>
      <p>
        Verbraucher haben die Möglichkeit, Beschwerden an die Online-Streitbeilegungsplattform der EU zu richten:{' '}
        <a href="https://ec.europa.eu/consumers/odr" rel="noopener" target="_blank">
          ec.europa.eu/consumers/odr
        </a>
        . Beschwerden können auch direkt an {OPERATOR.email} gerichtet werden. Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>Haftung für Inhalte und Links</h2>
      <p>
        Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Produktangaben, Mengenberechnungen und vorläufige Preise auf dieser Website sind unverbindlich.
        Eine Anfrage ist noch keine Bestellung; verbindlich wird ein Angebot erst nach persönlicher Prüfung und schriftlicher Bestätigung. Für Inhalte externer
        Links übernehmen wir keine Haftung; für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
      </p>

      <h2>Urheberrecht</h2>
      <p>Texte, Grafiken und Gestaltung dieser Website sind urheberrechtlich geschützt. Eine Verwendung außerhalb der gesetzlichen Schranken bedarf unserer Zustimmung.</p>

      <h2>Hinweis zum KI-Einsatz</h2>
      <p>
        Der Berater-Chat und die Foto-Einschätzung auf dieser Website nutzen künstliche Intelligenz und sind entsprechend gekennzeichnet. Details unter{' '}
        <a href="/ki-hinweis">KI-Hinweis</a>.
      </p>
    </LegalPage>
  );
}
