import Link from 'next/link';
import { ArrowDown, Mail, MapPin, Phone } from 'lucide-react';
import { LEGAL_LINKS, OPERATOR, SITE_NAME } from '@/lib/site';
import { Logo } from './Logo';

export interface FooterProps {
  /** Zeigt den Übergang „Weiter scrollen: Anfrage starten“ (Startseite). */
  showNext?: boolean;
}

export function Footer({ showNext = false }: FooterProps) {
  return (
    <footer className="bg-gruen text-sand" aria-labelledby="footer-heading">
      <div className="container-site py-14">
        <h2 id="footer-heading" className="sr-only">
          Kontakt und Rechtliches
        </h2>
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3 font-heading text-xl font-extrabold text-white">
              <Logo light />
              {SITE_NAME}
            </div>
            <p className="mt-4 max-w-xs text-sand/80">
              Bodenschutzplatten aus 100 % Recycling-Kunststoff. Für Baustellen, Veranstaltungen und Paddocks in ganz Österreich.
            </p>
          </div>

          <address className="not-italic">
            <p className="font-heading font-bold text-white">{OPERATOR.company}</p>
            <ul className="mt-3 space-y-2 text-sand/90">
              <li className="flex items-start gap-2">
                <MapPin className="mt-1 size-4 shrink-0 text-akzent" aria-hidden />
                <span>
                  {OPERATOR.street}
                  <br />
                  {OPERATOR.postalCode} {OPERATOR.city}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-akzent" aria-hidden />
                <a href={OPERATOR.phoneHref} className="touch inline-flex items-center hover:underline">
                  {OPERATOR.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-akzent" aria-hidden />
                <a href={OPERATOR.emailHref} className="touch inline-flex items-center hover:underline">
                  {OPERATOR.email}
                </a>
              </li>
            </ul>
          </address>

          <nav aria-label="Rechtliches">
            <p className="font-heading font-bold text-white">Rechtliches</p>
            <ul className="mt-3 space-y-1">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="touch inline-flex items-center text-sand/90 hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/app" className="touch inline-flex items-center text-sand/90 hover:underline">
                  App herunterladen
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/15 pt-6 text-sm text-sand/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {OPERATOR.company}. Produktdaten teilweise Platzhalter, werden vor dem Livebetrieb bestätigt.
          </p>
          <p>KI-Berater nach EU-KI-Verordnung Art. 50 gekennzeichnet.</p>
        </div>
      </div>

      {showNext && (
        <Link
          href="/anfrage"
          className="group block border-t border-white/15 bg-gruen-dunkel py-10 text-center transition-colors hover:bg-terracotta focus-visible:bg-terracotta"
        >
          <span className="text-sm font-bold tracking-[0.25em] text-akzent uppercase group-hover:text-white">Weiter scrollen</span>
          <span className="mt-2 flex items-center justify-center gap-3 font-heading text-3xl font-extrabold text-white sm:text-5xl">
            Anfrage starten
            <ArrowDown className="size-8 transition-transform group-hover:translate-y-1" aria-hidden />
          </span>
        </Link>
      )}
    </footer>
  );
}
