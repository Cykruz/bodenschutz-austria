'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { admin, describeError } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/site';
import type { AdminStats, Settings } from '@/lib/types';
import { Toggle } from '@/components/ui/Toggle';
import { Notice } from '@/components/ui/Notice';
import { Spinner } from '@/components/ui/Spinner';
import { PageHeader, Panel, PlaceholderNotice, Toast, useLoad } from '@/components/admin/shared';
import { ClipWege } from '@/components/clips/ClipWege';

const INQUIRY_KEYS = ['NEW', 'DRAFT', 'QUESTION', 'APPROVED', 'SENT', 'REJECTED'] as const;

export default function DashboardPage() {
  const { data, error, loading, setData } = useLoad<{ stats: AdminStats; settings: Settings }>(async () => {
    const [stats, settings] = await Promise.all([admin.stats(), admin.settings()]);
    return { stats, settings };
  });
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'ok' | 'error'>('ok');
  const [saving, setSaving] = useState(false);

  const autoSend = data?.settings.autoSendEnabled === 'true';

  async function toggleAutoSend(next: boolean) {
    if (!data) return;
    if (next && !window.confirm('Automatischen Versand wirklich einschalten? Freigegebene Regeln senden dann ohne persönliche Prüfung.')) return;
    setSaving(true);
    try {
      const settings = await admin.updateSettings({ autoSendEnabled: String(next) });
      setData({ ...data, settings: { ...data.settings, ...settings, autoSendEnabled: String(next) } });
      setToastTone('ok');
      setToast(next ? 'Automatischer Versand ist eingeschaltet.' : 'Automatischer Versand ist ausgeschaltet.');
    } catch (err) {
      setToastTone('error');
      setToast(describeError(err));
    } finally {
      setSaving(false);
    }
  }

  const inquiries = data?.stats.inquiries ?? {};
  const emails = data?.stats.emails ?? {};

  return (
    <>
      <PageHeader title="Übersicht" text="Alle Anfragen und E-Mails auf einen Blick. Nichts geht ohne deine Freigabe raus." />
      <PlaceholderNotice />
      {error && <Notice tone="error">{error}</Notice>}
      {loading && <Spinner />}

      {data && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="Anfragen" className="lg:col-span-2">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {INQUIRY_KEYS.map((k) => (
                <li key={k}>
                  <Link href={`/admin/anfragen?status=${k}`} className="block rounded-2xl bg-salbei px-4 py-4 hover:bg-salbei-dunkel">
                    <span className="block font-heading text-3xl font-extrabold text-gruen">{inquiries[k] ?? 0}</span>
                    <span className="text-sm font-semibold text-text">{STATUS_LABELS[k]}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-text">Gesamt: {inquiries.total ?? INQUIRY_KEYS.reduce((a, k) => a + (inquiries[k] ?? 0), 0)}</span>
              <Link href="/admin/anfragen" className="touch inline-flex items-center gap-1 font-semibold text-gruen hover:underline">
                Alle Anfragen <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </Panel>

          <Panel title="Posteingang">
            <ul className="space-y-2">
              {(['NEW', 'DRAFT', 'SENT', 'IGNORED'] as const).map((k) => (
                <li key={k} className="flex items-center justify-between rounded-2xl bg-sand px-4 py-3">
                  <span className="font-semibold text-text">{STATUS_LABELS[k]}</span>
                  <span className="font-heading text-2xl font-extrabold text-gruen">{emails[k] ?? 0}</span>
                </li>
              ))}
            </ul>
            <Link href="/admin/posteingang" className="touch mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gruen hover:underline">
              Zum Posteingang <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Panel>

          <Panel title="Automatischer Versand" className={`lg:col-span-3 ${autoSend ? 'border-warn bg-warn-hell' : ''}`}>
            <Toggle
              checked={autoSend}
              onChange={toggleAutoSend}
              disabled={saving}
              warn
              label={autoSend ? 'Eingeschaltet – freigegebene Regeln senden automatisch' : 'Ausgeschaltet – alles wartet auf deine Freigabe'}
              description="Betrifft nur Regeln, die unter „Regeln“ auf automatisch stehen. Prüffälle gehen immer an dich. Empfehlung: erst unterstützen, dann automatisieren."
            />
            {autoSend && (
              <Notice tone="warn" className="mt-4" title="Achtung: Versand läuft automatisch.">
                Standardfälle werden ohne persönliche Prüfung beantwortet, sofern die jeweilige Regel freigegeben ist.
              </Notice>
            )}
            <Toast message={toast} tone={toastTone} />
          </Panel>

          <Panel title="So werden Anfragen sortiert" className="lg:col-span-3">
            <div className="grid gap-6 lg:grid-cols-2">
              <ClipWege />
              <div className="space-y-3 text-text">
                <p>
                  <strong className="text-gruen">Weg A · Standardfall:</strong> Alle Angaben vollständig, Stapler vorhanden, Fläche und Paletten unter dem Grenzwert, keine Miete, keine Sonderwünsche. Das System bereitet den Angebotsentwurf vor. Automatisch versendet wird nur, wenn du die Regel und den Hauptschalter freigegeben hast.
                </p>
                <p>
                  <strong className="text-gruen">Weg B · Prüffall:</strong> Miete, fehlende Angaben, Kran nötig oder Entladung unklar, große Projekte, Sonderwünsche im Freitext oder keine Frachtzone. Du bekommst einen Entwurf oder eine Rückfrage und entscheidest selbst.
                </p>
                <p className="text-sm">Die KI ordnet ein und formuliert. Mengen, Preise und die Einstufung kommen aus festen Regeln.</p>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
