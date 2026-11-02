'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { admin } from '@/lib/api';
import { formatDate, formatNumber, parseJson } from '@/lib/format';
import { CLASSIFICATION_LABELS, PROJECT_TYPE_LABELS, STATUS_LABELS } from '@/lib/site';
import type { CalculationResult, InquiryStatus } from '@/lib/types';
import { Input, Select } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/Badge';
import { PageHeader, tableClasses as t, useLoad } from '@/components/admin/shared';

const STATUSES: InquiryStatus[] = ['NEW', 'DRAFT', 'QUESTION', 'APPROVED', 'SENT', 'REJECTED'];

function AnfragenListe() {
  const params = useSearchParams();
  const router = useRouter();
  const status = (params.get('status') ?? '') as InquiryStatus | '';
  const [q, setQ] = useState(params.get('q') ?? '');
  const [debounced, setDebounced] = useState(q);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(h);
  }, [q]);

  const { data, error, loading } = useLoad(() => admin.inquiries({ status, q: debounced }), [status, debounced]);

  function setStatus(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (next) sp.set('status', next);
    else sp.delete('status');
    router.replace(`/admin/anfragen${sp.toString() ? `?${sp}` : ''}`);
  }

  return (
    <>
      <PageHeader title="Anfragen" text="Alle Anfragen aus Website, App und E-Mail. Klicke eine Zeile für Details, Entwurf und Freigabe." />

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_240px]">
        <label className="relative block">
          <span className="sr-only">Suche nach Name, E-Mail, Ort oder Nummer</span>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-text/60" aria-hidden />
          <Input className="pl-12" placeholder="Suche nach Name, E-Mail, Ort oder Nummer" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label>
          <span className="sr-only">Status filtern</span>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Alle Status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {loading && <Spinner />}

      {data && data.length === 0 && !loading && <Notice tone="info">Keine Anfragen gefunden.</Notice>}

      {data && data.length > 0 && (
        <div className="karte overflow-x-auto">
          <table className={t.table}>
            <thead>
              <tr>
                <th className={t.th}>Eingang</th>
                <th className={t.th}>Kunde</th>
                <th className={t.th}>Vorhaben</th>
                <th className={t.th}>Mengen</th>
                <th className={t.th}>Einstufung</th>
                <th className={t.th}>Status</th>
                <th className={t.th}>
                  <span className="sr-only">Aktion</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((i) => {
                const calc = parseJson<CalculationResult | null>(i.calculation, null);
                return (
                  <tr key={i.id} className="hover:bg-sand/70">
                    <td className={t.td}>
                      <span className="whitespace-nowrap">{formatDate(i.createdAt)}</span>
                      <span className="block text-xs text-text/70">{i.channel === 'WEB' ? 'Website' : i.channel === 'APP' ? 'App' : 'E-Mail'}</span>
                    </td>
                    <td className={t.td}>
                      <span className="font-semibold text-gruen">{i.customerName}</span>
                      <span className="block text-sm text-text">
                        {i.postalCode} {i.city}
                      </span>
                    </td>
                    <td className={t.td}>
                      {PROJECT_TYPE_LABELS[i.projectType]}
                      {i.rentalRequested && <span className="block text-xs font-semibold text-terracotta-text">Miete</span>}
                    </td>
                    <td className={t.td}>
                      {calc ? (
                        <>
                          {formatNumber(calc.plates)} Platten
                          <span className="block text-sm text-text">
                            {calc.pallets} Pal. · {formatNumber(calc.areaM2)} m²
                          </span>
                        </>
                      ) : (
                        '–'
                      )}
                    </td>
                    <td className={t.td}>
                      <StatusBadge value={i.classification} label={CLASSIFICATION_LABELS[i.classification]} />
                    </td>
                    <td className={t.td}>
                      <StatusBadge value={i.status} label={STATUS_LABELS[i.status]} />
                    </td>
                    <td className={t.td}>
                      <Link href={`/admin/anfragen/${encodeURIComponent(i.id)}`} className="touch inline-flex items-center rounded-full bg-gruen px-4 text-sm font-bold text-white hover:bg-gruen-hell">
                        Öffnen
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function AnfragenPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AnfragenListe />
    </Suspense>
  );
}
