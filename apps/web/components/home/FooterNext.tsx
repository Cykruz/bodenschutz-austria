'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowDown } from 'lucide-react';

/** Übergang am Seitenende der Startseite: „Weiter scrollen: Anfrage starten“ (Vorbild lusion.co). */
export function FooterNext() {
  const pathname = usePathname();
  if (pathname !== '/') return null;
  return (
    <Link href="/anfrage" className="group block border-t border-white/15 bg-gruen-dunkel py-12 text-center transition-colors hover:bg-terracotta focus-visible:bg-terracotta">
      <span className="text-sm font-bold tracking-[0.25em] text-akzent uppercase group-hover:text-white">Weiter scrollen</span>
      <span className="mt-2 flex items-center justify-center gap-3 font-heading text-3xl font-extrabold text-white sm:text-5xl">
        Anfrage starten
        <ArrowDown className="size-8 transition-transform group-hover:translate-y-1" aria-hidden />
      </span>
    </Link>
  );
}
