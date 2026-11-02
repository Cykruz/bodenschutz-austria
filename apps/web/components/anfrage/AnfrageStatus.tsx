'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Phone } from 'lucide-react';
import { describeError, getInquiryPublic } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { OPERATOR, PRINCIPLES, STATUS_LABELS } from '@/lib/site';
import type { InquiryPublic } from '@/lib/types';
import { ButtonLink } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/Badge';
import { Confetti } from '@/components/ui/Confetti';

const STATUS_TEXT: Record<string, string> = {
  NEW: 'Deine Anfrage ist eingegangen und wartet auf die Prüfung.',
  DRAFT: 'Ein Angebotsentwurf wird gerade vorbereitet und persönlich geprüft.',
  QUESTION: 'Wir haben eine Rückfrage per E-Mail geschickt. Bitte sieh in dein Postfach.',
  APPROVED: 'Dein Angebot ist freigegeben und wird in Kürze versendet.',
  SENT: 'Dein Angebot wurde per E-Mail versendet.',
  REJECTED: 'Diese Anfrage konnte leider nicht bearbeitet werden. Bitte ruf uns kurz an.',
};

export function AnfrageStatus({ id }: { id: string }) {
  const [data, setData] = useState<InquiryPublic | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    getInquiryPublic(id)
      .then(setData)
      .catch((err) => setError(describeError(err)));
  }, [id]);

  return (
    <article className="karte relative p-6 sm:p-10">
      <Confetti />
      <div className="flex items-center gap-3 text-ok">
        <CheckCircle2 className="size-10" aria-hidden />
        <p className="text-sm font-bold tracking-wide uppercase">Danke für deine Anfrage</p>
      </div>
      <h1 className="mt-3 text-3xl sm:text-4xl">Deine Anfrage ist eingegangen.</h1>

      {error ? (
        <Notice tone="error" className="mt-6">
          {error}
        </Notice>
      ) : !data ? (
        <Spinner label="Status wird geladen …" />
      ) : (
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-sand px-4 py-3">
            <dt className="text-sm text-text">Vorgangsnummer</dt>
            <dd className="font-mono text-sm font-semibold break-all text-gruen">{data.id}</dd>
          </div>
          <div className="rounded-2xl bg-sand px-4 py-3">
            <dt className="text-sm text-text">Eingegangen</dt>
            <dd className="font-semibold text-gruen">{formatDate(data.createdAt)}</dd>
          </div>
          <div className="rounded-2xl bg-sand px-4 py-3">
            <dt className="text-sm text-text">Status</dt>
            <dd className="mt-1">
              <StatusBadge value={data.status} label={STATUS_LABELS[data.status] ?? data.status} />
            </dd>
          </div>
        </dl>
      )}

      {data && <p className="mt-6 text-lg text-text-dunkel">{STATUS_TEXT[data.status] ?? 'Wir melden uns bei dir.'}</p>}

      <div className="mt-8 space-y-3">
        <Notice tone="info" title={PRINCIPLES.noOrder}>
          Verbindlich wird es erst mit dem geprüften Angebot. Du gehst mit dieser Anfrage keine Verpflichtung ein.
        </Notice>
        <Notice tone="warn" title="Ein Foto ersetzt keine Vermessung.">
          Die Einschätzung des Untergrunds dient nur der Orientierung. Die Tragfähigkeit wird nicht geprüft.
        </Notice>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ButtonLink href="/" variant="secondary">
          Zur Startseite
        </ButtonLink>
        <a href={OPERATOR.phoneHref} className="touch inline-flex items-center gap-2 px-2 font-semibold text-gruen underline underline-offset-2">
          <Phone className="size-5" aria-hidden /> Fragen? {OPERATOR.phone}
        </a>
      </div>
    </article>
  );
}
