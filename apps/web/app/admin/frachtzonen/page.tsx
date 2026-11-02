'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { admin, describeError } from '@/lib/api';
import { formatEuro } from '@/lib/format';
import type { FreightZoneInput, FreightZoneSpec } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { Spinner } from '@/components/ui/Spinner';
import { Badge, PlaceholderBadge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { PageHeader, Panel, Toast, tableClasses as t, useLoad } from '@/components/admin/shared';

interface Form {
  id?: string;
  name: string;
  prefixes: string;
  perPallet: string;
  minimum: string;
  confirmed: boolean;
}

const toForm = (z?: FreightZoneSpec): Form => ({
  id: z?.id,
  name: z?.name ?? '',
  prefixes: z?.postalPrefixes.join(', ') ?? '',
  perPallet: z ? (z.pricePerPalletCents / 100).toFixed(2).replace('.', ',') : '',
  minimum: z ? (z.minimumCents / 100).toFixed(2).replace('.', ',') : '',
  confirmed: z ? !z.isPlaceholder : false,
});

const euroToCents = (s: string) => Math.max(0, Math.round(Number(s.replace(',', '.') || 0) * 100));

export default function FrachtzonenPage() {
  const { data, error, loading, reload } = useLoad(() => admin.freightZones());
  const [form, setForm] = useState<Form | null>(null);
  const [toDelete, setToDelete] = useState<FreightZoneSpec | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'ok' | 'error'>('ok');
  const [formError, setFormError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const prefixes = form.prefixes.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    if (!form.name.trim()) return setFormError('Bitte einen Namen eingeben.');
    if (prefixes.length === 0 || prefixes.some((p) => !/^\d{1,4}$/.test(p))) return setFormError('PLZ-Anfänge als Ziffern eingeben, z. B. 1, 2, 30 (durch Komma getrennt).');
    setFormError(null);
    setBusy(true);
    try {
      const payload: FreightZoneInput = {
        name: form.name.trim(),
        postalPrefixes: prefixes,
        pricePerPalletCents: euroToCents(form.perPallet),
        minimumCents: euroToCents(form.minimum),
        isPlaceholder: !form.confirmed,
      };
      if (form.id) await admin.updateFreightZone(form.id, payload);
      else await admin.createFreightZone(payload);
      setToastTone('ok');
      setToast('Frachtzone gespeichert.');
      setForm(null);
      reload();
    } catch (err) {
      setToastTone('error');
      setToast(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    setBusy(true);
    try {
      await admin.deleteFreightZone(toDelete.id);
      setToastTone('ok');
      setToast('Frachtzone gelöscht.');
      setToDelete(null);
      reload();
    } catch (err) {
      setToastTone('error');
      setToast(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Frachtzonen"
        text="Frachtkosten je Palette nach PLZ-Anfang. Der längste passende PLZ-Anfang gewinnt (z. B. „33“ vor „3“). Ohne passende Zone wird die Anfrage zum Prüffall."
        actions={
          <Button onClick={() => setForm(toForm())} icon={<Plus className="size-5" aria-hidden />}>
            Neue Zone
          </Button>
        }
      />
      {error && <Notice tone="error">{error}</Notice>}
      {loading && <Spinner />}
      <Toast message={toast} tone={toastTone} />

      {data && (
        <div className="karte mt-4 overflow-x-auto">
          <table className={t.table}>
            <thead>
              <tr>
                <th className={t.th}>Zone</th>
                <th className={t.th}>PLZ-Anfänge</th>
                <th className={t.th}>je Palette</th>
                <th className={t.th}>Mindestbetrag</th>
                <th className={t.th}>Status</th>
                <th className={t.th}>
                  <span className="sr-only">Aktionen</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((z) => (
                <tr key={z.id}>
                  <td className={`${t.td} font-semibold text-gruen`}>{z.name}</td>
                  <td className={t.td}>{z.postalPrefixes.map((p) => `${p}…`).join(', ')}</td>
                  <td className={t.td}>{formatEuro(z.pricePerPalletCents)}</td>
                  <td className={t.td}>{formatEuro(z.minimumCents)}</td>
                  <td className={t.td}>{z.isPlaceholder ? <PlaceholderBadge short /> : <Badge tone="green">Bestätigt</Badge>}</td>
                  <td className={t.td}>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setForm(toForm(z))} icon={<Pencil className="size-4" aria-hidden />}>
                        Bearbeiten
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setToDelete(z)} aria-label={`${z.name} löschen`} icon={<Trash2 className="size-4" aria-hidden />} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Panel title={form.id ? `„${form.name}“ bearbeiten` : 'Neue Frachtzone'} className="mt-6">
          <form onSubmit={save} className="grid gap-5 sm:grid-cols-2">
            {formError && (
              <Notice tone="error" className="sm:col-span-2">
                {formError}
              </Notice>
            )}
            <Field label="Name" required>
              {(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
            </Field>
            <Field label="PLZ-Anfänge" required hint="Durch Komma getrennt, z. B. 1, 2, 3, 7">
              {(p) => <Input {...p} value={form.prefixes} onChange={(e) => setForm({ ...form, prefixes: e.target.value })} />}
            </Field>
            <Field label="Preis je Palette in Euro" required>
              {(p) => <Input {...p} inputMode="decimal" value={form.perPallet} onChange={(e) => setForm({ ...form, perPallet: e.target.value })} />}
            </Field>
            <Field label="Mindestbetrag in Euro" required hint="Wird berechnet, wenn Paletten × Preis darunter liegt">
              {(p) => <Input {...p} inputMode="decimal" value={form.minimum} onChange={(e) => setForm({ ...form, minimum: e.target.value })} />}
            </Field>
            <label className="flex items-center gap-3 sm:col-span-2">
              <input type="checkbox" className="size-6 accent-gruen" checked={form.confirmed} onChange={(e) => setForm({ ...form, confirmed: e.target.checked })} />
              <span className="font-semibold text-gruen">Daten von Mario bestätigt (Platzhalter-Hinweis entfernen)</span>
            </label>
            <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row">
              <Button variant="ghost" onClick={() => setForm(null)} disabled={busy}>
                Abbrechen
              </Button>
              <Button type="submit" loading={busy}>
                Speichern
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <Dialog open={Boolean(toDelete)} title="Frachtzone löschen?" onClose={() => setToDelete(null)} confirmLabel="Löschen" confirmVariant="danger" loading={busy} onConfirm={remove}>
        <p>„{toDelete?.name}“ wird gelöscht. Anfragen aus diesem Gebiet werden dann als Prüffall eingestuft.</p>
      </Dialog>
    </>
  );
}
