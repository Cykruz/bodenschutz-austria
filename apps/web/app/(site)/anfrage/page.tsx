import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Wizard } from '@/components/anfrage/Wizard';
import { PRINCIPLES } from '@/lib/site';
import { Spinner } from '@/components/ui/Spinner';

export const metadata: Metadata = {
  title: 'Angebot anfragen',
  description:
    'Vorhaben beschreiben, Maße eingeben, Mengen ansehen und Angebot anfordern. Der Online-Berater von Bodenschutz Austria – ohne App, auf jedem Gerät.',
  alternates: { canonical: '/anfrage' },
};

export default function AnfragePage() {
  return (
    <div className="container-site py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-sm font-bold tracking-wide text-terracotta-text uppercase">Online-Berater</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">Vom Foto zum Angebot</h1>
          <p className="mt-3 max-w-2xl text-lg text-text">
            Sechs kurze Schritte, etwa drei Minuten. {PRINCIPLES.noOrder} Preise und Mengen prüft am Ende immer ein Mensch.
          </p>
        </header>
        <Suspense fallback={<Spinner label="Assistent wird geladen …" />}>
          <Wizard />
        </Suspense>
      </div>
    </div>
  );
}
