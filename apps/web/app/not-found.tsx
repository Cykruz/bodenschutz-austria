import Link from 'next/link';
import { buttonClasses } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <main className="container-site flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="text-sm font-bold tracking-wide text-terracotta-text uppercase">Fehler 404</p>
      <h1 className="mt-2 text-4xl sm:text-5xl">Diese Seite gibt es nicht.</h1>
      <p className="mt-4 max-w-md text-lg text-text">Vielleicht ist der Link veraltet. Der Berater und die Anfrage sind trotzdem nur einen Klick entfernt.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className={buttonClasses('secondary', 'lg')}>
          Zur Startseite
        </Link>
        <Link href="/anfrage" className={buttonClasses('primary', 'lg')}>
          Angebot anfragen
        </Link>
      </div>
    </main>
  );
}
