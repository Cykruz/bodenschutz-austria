import type { ReactNode } from 'react';

export function LegalPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="container-site py-10 sm:py-16">
      <article className="mx-auto max-w-3xl">
        <p className="text-sm font-bold tracking-wide text-terracotta-text uppercase">{eyebrow}</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">{title}</h1>
        {intro && <div className="mt-4 text-lg text-text">{intro}</div>}
        <div className="prose-site mt-8 text-text-dunkel">{children}</div>
      </article>
    </div>
  );
}

export function Platzhalter({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-warn-hell px-1.5 py-0.5 font-semibold text-warn" title="Platzhalter – vor dem Livebetrieb ergänzen">
      {children}
    </mark>
  );
}
