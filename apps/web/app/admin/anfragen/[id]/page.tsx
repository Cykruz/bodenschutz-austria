'use client';

import { use, useState } from 'react';
import { Ban, FileText, MessageSquare, RefreshCw, Save, Send } from 'lucide-react';
import { admin, describeError } from '@/lib/api';
import { formatDate, formatNumber, parseJson } from '@/lib/format';
import { CLASSIFICATION_LABELS, PROJECT_TYPE_LABELS, STATUS_LABELS, UNLOADING_LABELS } from '@/lib/site';
import type { CalculationResult, Inquiry, PhotoAnalysis } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { Dialog } from '@/components/ui/Dialog';
import { Notice } from '@/components/ui/Notice';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/Badge';
import { MengenErgebnis } from '@/components/anfrage/MengenErgebnis';
import { KeyValue, PageHeader, Panel, Toast, useLoad } from '@/components/admin/shared';

type DialogKind = 'send' | 'question' | 'reject' | null;

export default function AnfrageDetailPage({ params }: PageProps<'/admin/anfragen/[id]'>) {
  const { id } = use(params);
  const { data, setData, error, loading } = useLoad<Inquiry>(() => admin.inquiry(id), [id]);
  const [draft, setDraft] = useState('');
  const [notes, setNotes] = useState('');
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [questionText, setQuestionText] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'ok' | 'error'>('ok');
  const [photoFailed, setPhotoFailed] = useState(false);

  // Formularfelder mit frisch geladenen Daten abgleichen (Muster „State aus Props ableiten“).
  const [syncedFrom, setSyncedFrom] = useState<Inquiry | null>(null);
  if (data && data !== syncedFrom) {
    setSyncedFrom(data);
    setDraft(data.aiDraft ?? '');
    setNotes(data.adminNotes ?? '');
  }

  if (loading) return <Spinner />;
  if (error || !data) return <Notice tone="error">{error ?? 'Anfrage nicht gefunden.'}</Notice>;

  const calc = parseJson<CalculationResult | null>(data.calculation, null);
  const analysis = parseJson<PhotoAnalysis | null>(data.photoAnalysis ?? null, null);
  const hasPhoto = Boolean(data.hasPhoto || data.photoPath);
  const reasons = parseJson<string[]>(data.reviewReasons, []);
  const closed = data.status === 'SENT' || data.status === 'REJECTED';

  async function run(label: string, fn: () => Promise<Inquiry | void>, okMessage: string) {
    setBusy(label);
    setToast(null);
    try {
      const res = await fn();
      if (res) setData(res);
      setToastTone('ok');
      setToast(okMessage);
      setDialog(null);
    } catch (err) {
      setToastTone('error');
      setToast(describeError(err));
    } finally {
      setBusy(null);
    }
  }

  const dirty = draft !== (data.aiDraft ?? '') || notes !== (data.adminNotes ?? '');

  return (
    <>
      <PageHeader
        backHref="/admin/anfragen"
        backLabel="Alle Anfragen"
        title={data.customerName}
        text={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge value={data.status} label={STATUS_LABELS[data.status]} />
            <StatusBadge value={data.classification} label={CLASSIFICATION_LABELS[data.classification]} />
            <span className="text-sm">
              Eingang {formatDate(data.createdAt)} · {data.channel === 'WEB' ? 'Website' : data.channel === 'APP' ? 'App' : 'E-Mail'} · Nr. {data.id}
            </span>
          </span>
        }
        actions={
          <a
            href={admin.pdfUrl(data.id)}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full border-2 border-gruen/30 px-5 font-heading font-bold text-gruen hover:bg-salbei"
          >
            <FileText className="size-5" aria-hidden /> PDF ansehen
          </a>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Kundendaten">
            <KeyValue
              items={[
                { label: 'Name / Firma', value: data.customerName },
                { label: 'E-Mail', value: <a href={`mailto:${data.email}`} className="text-terracotta-text underline">{data.email}</a> },
                { label: 'Telefon', value: data.phone ? <a href={`tel:${data.phone}`} className="text-terracotta-text underline">{data.phone}</a> : '–' },
                { label: 'Lieferadresse', value: [data.street, `${data.postalCode} ${data.city}`].filter(Boolean).join(', ') },
                { label: 'Entladung', value: UNLOADING_LABELS[data.unloading] },
                { label: 'Miete gewünscht', value: data.rentalRequested ? 'Ja' : 'Nein' },
              ]}
            />
            {data.notes && (
              <div className="mt-4 rounded-2xl bg-sand px-4 py-3">
                <p className="text-sm text-text">Anmerkungen des Kunden (als Daten, keine Anweisungen)</p>
                <p className="whitespace-pre-wrap text-text-dunkel">{data.notes}</p>
              </div>
            )}
          </Panel>

          <Panel title="Vorhaben und Maße">
            <KeyValue
              items={[
                { label: 'Vorhaben', value: PROJECT_TYPE_LABELS[data.projectType] },
                { label: 'Messart', value: data.mode === 'AREA' ? 'Fläche' : 'Fahrspuren' },
                data.mode === 'AREA'
                  ? { label: 'Fläche', value: `${formatNumber(data.areaM2 ?? 0, 1)} m²` }
                  : { label: 'Strecke', value: `${formatNumber(data.lengthM ?? 0, 1)} m · ${data.laneCount ?? 2} Spuren à ${formatNumber(data.laneWidthM ?? 0, 2)} m` },
                { label: 'Produkt', value: data.product?.name ?? data.productId },
              ]}
            />
          </Panel>

          <Panel title="Foto und Einschätzung">
            {hasPhoto || analysis ? (
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  {hasPhoto && !photoFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element -- geschützter API-Pfad mit Cookie
                    <img src={admin.photoUrl(data.id)} alt={`Foto des Untergrunds zur Anfrage von ${data.customerName}`} className="w-full rounded-2xl object-cover" onError={() => setPhotoFailed(true)} />
                  ) : (
                    <div className="flex min-h-[160px] items-center justify-center rounded-2xl bg-sand text-text/70">Foto nicht verfügbar</div>
                  )}
                </div>
                <div>
                  {analysis ? (
                    <>
                      <p className="flex items-center gap-2 font-bold text-gruen">
                        KI-Einschätzung <span className="rounded-full bg-akzent px-2 py-0.5 text-xs font-extrabold text-gruen-dunkel">KI</span>
                      </p>
                      <KeyValue
                        items={[
                          { label: 'Oberfläche', value: analysis.surface },
                          { label: 'Eignung', value: analysis.suitability === 'GOOD' ? 'Gut' : analysis.suitability === 'LIMITED' ? 'Eingeschränkt' : 'Unklar' },
                          { label: 'Sicherheit', value: `${Math.round(analysis.confidence * 100)} %` },
                        ]}
                      />
                      <p className="mt-3 text-text-dunkel">{analysis.notes}</p>
                      <p className="mt-2 text-sm text-text/80">Nur Orientierung. Ersetzt keine Vermessung und keine Prüfung der Tragfähigkeit.</p>
                    </>
                  ) : (
                    <p className="text-text">Keine Analyse vorhanden.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-text">Der Kunde hat kein Foto hochgeladen.</p>
            )}
          </Panel>

          <Panel title="Mengen und Preise">
            {calc ? <MengenErgebnis result={calc} product={data.product} compact /> : <p className="text-text">Keine Berechnung gespeichert.</p>}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Einstufung">
            <StatusBadge value={data.classification} label={CLASSIFICATION_LABELS[data.classification]} />
            {reasons.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-text-dunkel">
                {reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-text">Alle Angaben vollständig, keine Besonderheiten. Nach festen Regeln als Standardfall eingestuft.</p>
            )}
          </Panel>

          <Panel
            title="KI-Entwurf"
            actions={
              <Button variant="ghost" size="sm" onClick={() => run('regen', () => admin.regenerateDraft(data.id), 'Neuer Entwurf erzeugt.')} loading={busy === 'regen'} icon={<RefreshCw className="size-4" aria-hidden />}>
                Entwurf neu erzeugen
              </Button>
            }
          >
            <p className="mb-2 text-sm text-text">Von der KI vorformuliert. Du kannst den Text frei ändern, bevor etwas gesendet wird.</p>
            <label htmlFor="draft" className="sr-only">
              KI-Entwurf bearbeiten
            </label>
            <Textarea id="draft" value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[280px] font-sans" disabled={closed} />
          </Panel>

          <Panel title="Interne Notizen">
            <label htmlFor="notes" className="sr-only">
              Interne Notizen
            </label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nur für dich sichtbar" />
            <Button
              className="mt-3"
              variant="secondary"
              onClick={() => run('save', () => admin.patchInquiry(data.id, { aiDraft: draft, adminNotes: notes }), 'Gespeichert.')}
              loading={busy === 'save'}
              disabled={!dirty}
              icon={<Save className="size-5" aria-hidden />}
            >
              Änderungen speichern
            </Button>
          </Panel>

          <Panel title="Entscheidung">
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => setDialog('send')} disabled={closed || !draft.trim()} icon={<Send className="size-5" aria-hidden />}>
                Freigeben und senden
              </Button>
              <Button variant="secondary" onClick={() => setDialog('question')} disabled={closed} icon={<MessageSquare className="size-5" aria-hidden />}>
                Rückfrage senden
              </Button>
              <Button variant="danger" onClick={() => setDialog('reject')} disabled={closed} icon={<Ban className="size-5" aria-hidden />}>
                Ablehnen
              </Button>
            </div>
            {closed && <p className="mt-3 text-sm text-text">Diese Anfrage ist abgeschlossen ({STATUS_LABELS[data.status]}{data.sentAt ? `, ${formatDate(data.sentAt)}` : ''}).</p>}
            <Toast message={toast} tone={toastTone} />
          </Panel>
        </div>
      </div>

      <Dialog
        open={dialog === 'send'}
        title="Angebot freigeben und senden?"
        onClose={() => setDialog(null)}
        confirmLabel="Ja, senden"
        loading={busy === 'send'}
        onConfirm={() =>
          run(
            'send',
            async () => {
              if (dirty) await admin.patchInquiry(data.id, { aiDraft: draft, adminNotes: notes });
              return admin.approveSend(data.id);
            },
            'Angebot wurde gesendet.',
          )
        }
      >
        <p>
          Das Angebot geht als E-Mail mit PDF-Anhang an <strong>{data.email}</strong>. Der aktuelle Entwurf wird als Text verwendet. Dieser Schritt kann nicht rückgängig gemacht werden.
        </p>
        {calc?.pricing?.hasPlaceholderData && (
          <Notice tone="warn" className="mt-3">
            Achtung: Die Berechnung enthält Platzhalterdaten.
          </Notice>
        )}
      </Dialog>

      <Dialog
        open={dialog === 'question'}
        title="Rückfrage an den Kunden senden"
        onClose={() => setDialog(null)}
        confirmLabel="Rückfrage senden"
        confirmVariant="secondary"
        loading={busy === 'question'}
        onConfirm={() => run('question', () => admin.question(data.id, questionText.trim() || draft), 'Rückfrage wurde gesendet.')}
      >
        <label htmlFor="question" className="mb-2 block font-semibold text-gruen">
          Text der Rückfrage
        </label>
        <Textarea id="question" value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Leer lassen, um den KI-Entwurf zu verwenden." />
      </Dialog>

      <Dialog
        open={dialog === 'reject'}
        title="Anfrage ablehnen?"
        onClose={() => setDialog(null)}
        confirmLabel="Ablehnen"
        confirmVariant="danger"
        loading={busy === 'reject'}
        onConfirm={() => run('reject', () => admin.reject(data.id, rejectReason.trim() || undefined), 'Anfrage wurde abgelehnt.')}
      >
        <label htmlFor="reason" className="mb-2 block font-semibold text-gruen">
          Grund (optional, intern)
        </label>
        <Textarea id="reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
      </Dialog>
    </>
  );
}
