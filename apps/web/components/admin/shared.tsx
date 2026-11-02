'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { describeError } from '@/lib/api';

export function PageHeader({ title, text, actions, backHref, backLabel }: { title: string; text?: ReactNode; actions?: ReactNode; backHref?: string; backLabel?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {backHref && (
          <Link href={backHref} className="touch mb-1 inline-flex items-center gap-1 text-sm font-semibold text-gruen hover:underline">
            <ArrowLeft className="size-4" aria-hidden /> {backLabel ?? 'Zurück'}
          </Link>
        )}
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {text && <p className="mt-1 max-w-2xl text-text">{text}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className = '', actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`karte p-5 sm:p-6 ${className}`} aria-label={title}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-xl">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function KeyValue({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-sm text-text">{it.label}</dt>
          <dd className="font-semibold break-words text-text-dunkel">{it.value ?? '–'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PlaceholderNotice() {
  return (
    <div role="status" className="mb-6 flex gap-3 rounded-2xl border border-akzent bg-warn-hell px-4 py-3 text-warn">
      <span aria-hidden className="mt-0.5 font-extrabold">
        !
      </span>
      <div>
        <p className="font-bold">Platzhalterdaten aktiv</p>
        <p className="text-sm">Produktmaße, Gewichte, Paletten und Frachtpreise sind noch nicht bestätigt. Vorläufige Preise tragen deshalb den Hinweis „Platzhalter“. Bitte unter Produkte und Frachtzonen prüfen und bestätigen.</p>
      </div>
    </div>
  );
}

/** Einfacher Lade-Hook für Admin-Seiten: lädt neu, wenn sich `deps` ändern oder `reload()` aufgerufen wird. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [tick, setTick] = useState(0);
  const requestKey = `${JSON.stringify(deps)}#${tick}`;
  const [result, setResult] = useState<{ key: string | null; data: T | null; error: string | null }>({ key: null, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    loader()
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, data, error: null });
      })
      .catch((err) => {
        if (!cancelled) setResult((prev) => ({ key: requestKey, data: prev.data, error: describeError(err) }));
      });
    return () => {
      cancelled = true;
    };
    // Der Loader selbst wird bewusst nicht beobachtet (Inline-Funktion); maßgeblich sind deps und tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((data: T) => setResult((prev) => ({ ...prev, data })), []);
  const loading = result.key !== requestKey;
  return { data: result.data, setData, error: result.error, loading, reload };
}

export function Toast({ message, tone = 'ok' }: { message: string | null; tone?: 'ok' | 'error' }) {
  if (!message) return null;
  return (
    <p role="status" className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${tone === 'ok' ? 'bg-ok-hell text-ok' : 'bg-fehler-hell text-fehler'}`}>
      {message}
    </p>
  );
}

export const tableClasses = {
  table: 'w-full border-collapse text-left text-[0.95rem]',
  th: 'border-b border-linie px-3 py-3 text-sm font-bold text-gruen',
  td: 'border-b border-linie/70 px-3 py-3 align-top',
};
