'use client';

import Link from 'next/link';
import { admin } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { STATUS_LABELS } from '@/lib/site';
import { Notice } from '@/components/ui/Notice';
import { Spinner } from '@/components/ui/Spinner';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { PageHeader, tableClasses as t, useLoad } from '@/components/admin/shared';

export default function ProtokollPage() {
  const { data, error, loading } = useLoad(async () => {
    const [emails, inquiries] = await Promise.all([admin.emails(), admin.inquiries()]);
    const rows = [
      ...emails.map((e) => ({
        id: `m_${e.id}`,
        at: e.receivedAt,
        kind: e.direction === 'OUT' ? 'E-Mail gesendet' : 'E-Mail empfangen',
        who: e.direction === 'OUT' ? e.toAddress : e.fromAddress,
        subject: e.subject,
        status: e.status,
        auto: e.autoSent,
        href: e.inquiryId ? `/admin/anfragen/${encodeURIComponent(e.inquiryId)}` : `/admin/posteingang?id=${encodeURIComponent(e.id)}`,
      })),
      ...inquiries.map((i) => ({
        id: `i_${i.id}`,
        at: i.sentAt ?? i.updatedAt ?? i.createdAt,
        kind: i.sentAt ? 'Angebot gesendet' : i.status === 'NEW' ? 'Anfrage eingegangen' : 'Anfrage aktualisiert',
        who: i.email,
        subject: `${i.customerName} · ${i.postalCode} ${i.city}`,
        status: i.status,
        auto: false,
        href: `/admin/anfragen/${encodeURIComponent(i.id)}`,
      })),
    ];
    return rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  });

  return (
    <>
      <PageHeader title="Protokoll" text="Was wann rausging und reinkam: Anfragen, Angebote und E-Mails in zeitlicher Reihenfolge. Automatisch versendete Nachrichten sind markiert." />
      {error && <Notice tone="error">{error}</Notice>}
      {loading && <Spinner />}
      {data && data.length === 0 && <Notice tone="info">Noch keine Einträge.</Notice>}
      {data && data.length > 0 && (
        <div className="karte overflow-x-auto">
          <table className={t.table}>
            <thead>
              <tr>
                <th className={t.th}>Zeitpunkt</th>
                <th className={t.th}>Ereignis</th>
                <th className={t.th}>Wer</th>
                <th className={t.th}>Betreff</th>
                <th className={t.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="hover:bg-sand/70">
                  <td className={`${t.td} whitespace-nowrap`}>{formatDate(r.at)}</td>
                  <td className={t.td}>
                    <Link href={r.href} className="font-semibold text-gruen hover:underline">
                      {r.kind}
                    </Link>
                    {r.auto && (
                      <>
                        {' '}
                        <Badge tone="orange">automatisch</Badge>
                      </>
                    )}
                  </td>
                  <td className={`${t.td} break-all`}>{r.who}</td>
                  <td className={t.td}>{r.subject}</td>
                  <td className={t.td}>
                    <StatusBadge value={r.status} label={STATUS_LABELS[r.status] ?? r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
