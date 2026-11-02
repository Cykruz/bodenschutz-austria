import Link from 'next/link';
import { ArrowRight, Factory, Tent, Warehouse } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';

const CARDS = [
  {
    icon: Factory,
    title: 'Industrie & Schwerlast',
    text: 'Befahrbarer Boden ohne Standzeiten. Für Kran, LKW und Baustellenzufahrt.',
    cta: 'Angebot für Baustelle',
    href: '/anfrage?vorhaben=CONSTRUCTION',
    tags: 'Baustelle • Kran • Zufahrt',
    style: 'bg-gruen',
    icon_: 'text-akzent',
    text_: 'text-[#C9D6CC]',
    heading_: 'text-white',
    cta_: 'text-akzent',
  },
  {
    icon: Warehouse,
    title: 'Paddock & Reitsport',
    text: 'Matschfrei durch den Winter. Trittsicher für Pferd und Mensch.',
    cta: 'Angebot für Paddock',
    href: '/anfrage?vorhaben=PADDOCK',
    tags: 'Paddock • Auslauf • Führanlage',
    style: 'bg-salbei',
    icon_: 'text-terracotta-text',
    text_: 'text-text',
    heading_: '',
    cta_: 'text-terracotta-text',
  },
  {
    icon: Tent,
    title: 'Events & Kommunen',
    text: 'Bodenschutz ohne Versiegelung. Feuerwehrzufahrt, grüner Parkplatz, Eventweg.',
    cta: 'Angebot für Event',
    href: '/anfrage?vorhaben=EVENT',
    tags: 'Festival • Feuerwehr • Parkplatz',
    style: 'bg-white border border-linie',
    icon_: 'text-terracotta-text',
    text_: 'text-text',
    heading_: '',
    cta_: 'text-terracotta-text',
  },
];

export function Einsaetze() {
  return (
    <section id="loesungen" className="bg-sand py-20 sm:py-28" aria-labelledby="einsaetze-title">
      <div className="container-site flex flex-col gap-12">
        <SectionHeading eyebrow="Für wen" title={<span id="einsaetze-title">Drei Einsätze. Eine Platte.</span>} text="Wähle dein Vorhaben. Der Rest wird für dich vorbereitet." />
        <ul className="grid gap-6 md:grid-cols-3">
          {CARDS.map((c) => (
            <li key={c.title}>
              <Link href={c.href} className={`tilt flex min-h-[360px] flex-col justify-between gap-6 rounded-[28px] p-8 ${c.style}`}>
                <div className="flex items-start justify-between gap-3">
                  <c.icon className={`size-12 shrink-0 ${c.icon_}`} aria-hidden strokeWidth={1.6} />
                  <span className={`text-right text-xs font-bold tracking-[0.18em] uppercase ${c.text_}`}>{c.tags}</span>
                </div>
                <div>
                  <h3 className={`text-3xl ${c.heading_}`}>{c.title}</h3>
                  <p className={`mt-3 text-lg ${c.text_}`}>{c.text}</p>
                </div>
                <span className={`inline-flex items-center gap-2 font-heading font-extrabold ${c.cta_}`}>
                  {c.cta} <ArrowRight className="size-5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
