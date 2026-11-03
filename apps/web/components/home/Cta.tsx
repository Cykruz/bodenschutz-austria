import Link from 'next/link';
import { ArrowRight, Phone } from 'lucide-react';
import { OPERATOR } from '@/lib/site';
import { buttonClasses } from '@/components/ui/Button';

export function Cta() {
  return (
    <section id="anfrage" className="bg-salbei py-24 sm:py-32" aria-labelledby="cta-title">
      <div className="container-site text-center">
        <h2 id="cta-title" className="mx-auto max-w-4xl text-[clamp(2.2rem,6vw,4.5rem)] leading-[1.05]">
          Bereit? Dein Angebot in drei Minuten.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-xl text-text">Foto machen, Maße eingeben, Anfrage senden. Wir melden uns persönlich.</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/anfrage" className={buttonClasses('primary', 'lg')}>
            Angebot anfragen <ArrowRight className="size-5" aria-hidden />
          </Link>
          <a href={OPERATOR.phoneHref} className={buttonClasses('ghost', 'lg')}>
            <Phone className="size-5" aria-hidden /> {OPERATOR.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
