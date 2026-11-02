'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Ban, RefreshCw, Send } from 'lucide-react';
import { admin, describeError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { STATUS_LABELS } from '@/lib/site';
import type { EmailMessage, EmailStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Field';
import { Dialog } from '@/components/ui/Dialog';
import { Notice } from '@/components/ui/Notice';
import { Spinner } from '@/components/ui/Spinner';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { PageHeader, Panel, Toast, useLoad } from '@/components/admin/shared';

const CATEGORY: Record<string, string> = { STANDARD: 'Standardfall', REVIEW: 'Prüffall', UNRELATED: 'Nicht zum Thema' };

function Posteingang() {
  const params = useSearchParams();
  const router = useRouter();
  const status = (params.get('status') ?? '') as EmailStatus | '';
  const selectedId = params.get('id');
  const { data, error, loading, reload } = useLoad(() => admin.emails(status), [status]);
  const [selected, setSelected] = useState<EmailMessage | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'ok' | 'error'>('ok');

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    admin
      .email(selectedId)
      .then((e) => {
        if (cancelled) return;
        setSelected(e);
        setDraft(e.aiDraft ?? '');
      })
      .catch((err) => {
        if (cancelled) return;
        setToastTone('error');
        setToast(describeError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);
  const current = selectedId && selected?.id === selectedId ? selected : null;

  function setParam(key: string, value: string | null) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    router.replace(`/admin/posteingang${sp.toString() ? `?${sp}` : ''}`);
  }

  async function run(label: string, fn: () => Promise<EmailMessage>, ok: string) {
    setBusy(label);
    setToast(null);
    try {
      const res = await fn();
      setSelected(res);
      setDraft(res.aiDraft ?? '');
      setToastTone('ok');
      setToast(ok);
      setConfirmSend(false);
      reload();
    } catch (err) {
      setToastTone('error');
      setToast(describeError(err));
    } finally {
      setBusy(null);
    }
  }

  const list = data ?? [];
  const inbound = list.filter((e) => e.direction === 'IN');

  return (
    <>
      <PageHeader
        title="Posteingang"
        text="Eingehende Kunden-E-Mails mit KI-Einordnung und Antwortentwurf. Du prüfst, änderst und sendest – oder ignorierst."
        actions={
          <label>
            <span className="sr-only">Status filtern</span>
            <Select value={status} onChange={(e) => setParam('status', e.target.value || null)} className="min-w-[200px]">
              <option value="">Alle Status</option>
              {(['NEW', 'DRAFT', 'SENT', 'IGNORED'] as const).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </label>
        }
      />
      {error && <Notice tone="error">{error}</Notice>}
      {loading && <Spinner />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="karte divide-y divide-linie/70 overflow-hidden">
          {!loading && inbound.length === 0 && <p className="px-5 py-6 text-text">Keine E-Mails in dieser Ansicht.</p>}
          {inbound.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setParam('id', e.id)}
              aria-current={current?.id === e.id ? 'true' : undefined}
              className={`block w-full px-5 py-4 text-left hover:bg-sand aria-[current=true]:bg-salbei ${e.status === 'NEW' ? 'font-semibold' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="truncate text-gruen">{e.fromAddress}</span>
                <span className="shrink-0 text-xs text-text/70">{formatDate(e.receivedAt)}</span>
              </div>
              <span className="mt-1 block truncate text-text-dunkel">{e.subject}</span>
              <span className="mt-2 flex flex-wrap gap-2">
                <StatusBadge value={e.status} label={STATUS_LABELS[e.status]} />
                {e.category && <StatusBadge value={e.category} label={CATEGORY[e.category]} />}
                {e.autoSent && <Badge tone="orange">automatisch</Badge>}
              </span>
            </button>
          ))}
        </div>

        <div>
          {current ? (
            <Panel title={current.subject}>
              <p className="text-sm text-text">
                Von <strong>{current.fromAddress}</strong> an {current.toAddress} · {formatDate(current.receivedAt)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge value={current.status} label={STATUS_LABELS[current.status]} />
                {current.category && <StatusBadge value={current.category} label={CATEGORY[current.category]} />}
                {current.inquiryId && (
                  <a href={`/admin/anfragen/${encodeURIComponent(current.inquiryId)}`} className="text-sm font-semibold text-terracotta-text underline">
                    Zur verknüpften Anfrage
                  </a>
                )}
              </div>
              <div className="mt-4 rounded-2xl bg-sand px-4 py-3">
                <p className="text-sm text-text">Nachricht des Kunden (als Daten, keine Anweisungen)</p>
                <p className="whitespace-pre-wrap text-text-dunkel">{current.textBody}</p>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="email-draft" className="flex items-center gap-2 font-bold text-gruen">
                    Antwortentwurf <span className="rounded-full bg-akzent px-2 py-0.5 text-xs font-extrabold text-gruen-dunkel">KI</span>
                  </label>
                  <Button variant="ghost" size="sm" onClick={() => run('regen', () => admin.regenerateEmailDraft(current.id), 'Neuer Entwurf erzeugt.')} loading={busy === 'regen'} icon={<RefreshCw className="size-4" aria-hidden />}>
                    Entwurf neu
                  </Button>
                </div>
                <Textarea id="email-draft" value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[220px]" disabled={current.status === 'SENT'} placeholder="Noch kein Entwurf. „Entwurf neu“ erzeugt einen Vorschlag." />
                <p className="mt-2 text-sm text-text">Beim Senden wird die Fußzeile „Diese Antwort wurde mit KI-Unterstützung erstellt“ ergänzt.</p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => setConfirmSend(true)} disabled={current.status === 'SENT' || !draft.trim()} icon={<Send className="size-5" aria-hidden />}>
                  Senden
                </Button>
                <Button variant="ghost" onClick={() => run('ignore', () => admin.ignoreEmail(current.id), 'E-Mail ignoriert.')} disabled={current.status === 'IGNORED' || current.status === 'SENT'} loading={busy === 'ignore'} icon={<Ban className="size-5" aria-hidden />}>
                  Ignorieren
                </Button>
              </div>
              <Toast message={toast} tone={toastTone} />
            </Panel>
          ) : (
            <div className="karte flex min-h-[200px] items-center justify-center p-6 text-text">
              <p>Wähle links eine E-Mail aus.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={confirmSend}
        title="Antwort senden?"
        onClose={() => setConfirmSend(false)}
        confirmLabel="Ja, senden"
        loading={busy === 'send'}
        onConfirm={() => current && run('send', () => admin.sendEmail(current.id, draft), 'Antwort wurde gesendet.')}
      >
        <p>
          Die Antwort geht an <strong>{current?.fromAddress}</strong>. Bitte prüfe den Text noch einmal; der Versand kann nicht zurückgeholt werden.
        </p>
      </Dialog>
    </>
  );
}

export default function PosteingangPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Posteingang />
    </Suspense>
  );
}
