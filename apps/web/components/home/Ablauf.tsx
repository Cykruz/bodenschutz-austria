import Link from 'next/link';
import { ClipAblauf } from '@/components/clips/ClipAblauf';
import { buttonClasses } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';

const STEPS = [
  { title: 'Foto machen', text: 'Fotografiere den Untergrund. Die KI schätzt ein, was sie sieht. Das ist nur eine Orientierung, kein Gutachten. Geht auch ohne Foto.' },
  { title: 'Maße eingeben', text: 'Fläche in Quadratmetern oder die Länge der Fahrstrecke. Feste Regeln rechnen Platten und Paletten aus, nicht die KI.' },
  { title: 'Angebot erhalten', text: 'Kontakt und Lieferort angeben. Ein Mensch prüft und schickt dir das Angebot. Eine Anfrage ist noch keine Bestellung.' },
];

/** Handy-Mockup mit dem Mengen-Schritt des Assistenten (reines HTML/CSS, Zahlen aus dem Entwurf). */
function PhoneMockup() {
  return (
    <div className="float-slow mx-auto w-[260px] rounded-[40px] border-[10px] border-gruen-dunkel bg-sand p-4 shadow-karte" aria-hidden>
      <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-gruen-dunkel/60" />
      <p className="text-[11px] font-bold text-terracotta-text">Schritt 4 von 6 · Mengen</p>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-salbei-dunkel">
        <div className="h-full w-[60%] rounded-full bg-gruen" />
      </div>
      <p className="mt-3 font-heading text-lg leading-tight font-extrabold text-gruen">120 m² Baustellenzufahrt</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          ['Platten', '46'],
          ['Paletten', '2'],
          ['Gewicht', '1,7 t'],
          ['Preis', 'vorläufig'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-salbei px-3 py-2">
            <p className="text-[10px] font-semibold text-text">{k}</p>
            <p className="font-heading text-base font-extrabold text-gruen">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-text/80">Beispiel mit Platzhalterdaten, nach festen Regeln gerechnet.</p>
      <div className="mt-3 rounded-full bg-terracotta py-2 text-center text-xs font-extrabold text-gruen-dunkel">Weiter</div>
    </div>
  );
}

export function Ablauf() {
  return (
    <section id="sogehts" className="bg-salbei py-20 sm:py-28" aria-labelledby="ablauf-title">
      <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
          <SectionHeading eyebrow="So geht’s" title={<span id="ablauf-title">Vom Foto zum Angebot in drei Schritten.</span>} text="Kein Konto, keine App nötig. Am Handy direkt von der Baustelle aus." />
          <Link href="/anfrage" className={buttonClasses('secondary', 'lg', 'mt-8')}>
            Jetzt starten
          </Link>
          <ClipAblauf className="mt-10" caption="Foto, Zahlen, Anfrage. Mario gibt frei." />
        </div>
        <div className="lg:col-span-7">
          <ol className="space-y-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className={`tilt flex gap-6 rounded-[24px] p-7 sm:p-8 ${i === 2 ? 'bg-gruen text-sand' : 'karte'}`}>
                <span className={`font-heading text-4xl leading-none font-extrabold ${i === 2 ? 'text-akzent' : 'text-terracotta'}`}>{i + 1}</span>
                <div>
                  <h3 className={`text-2xl ${i === 2 ? 'text-white' : ''}`}>{s.title}</h3>
                  <p className={`mt-2 text-lg ${i === 2 ? 'text-[#C9D6CC]' : 'text-text'}`}>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-12">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
