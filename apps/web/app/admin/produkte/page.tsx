'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { admin, describeError } from '@/lib/api';
import { formatEuro } from '@/lib/format';
import type { ProductInput, ProductSpec } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { Spinner } from '@/components/ui/Spinner';
import { Badge, PlaceholderBadge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { PageHeader, Panel, Toast, tableClasses as t, useLoad } from '@/components/admin/shared';

const empty: ProductInput = {
  name: '',
  slug: '',
  description: '',
  material: '100 % Recycling-Kunststoff',
  lengthCm: 240,
  widthCm: 120,
  thicknessMm: 15,
  weightKg: 38,
  platesPerPallet: 25,
  pricePerPlateCents: 0,
  loadCapacityTons: 40,
  isPlaceholder: true,
  active: true,
  sortOrder: 1,
};

export default function ProduktePage() {
  const { data, error, loading, reload } = useLoad(() => admin.products());
  const [editing, setEditing] = useState<(ProductInput & { id?: string }) | null>(null);
  const [priceEuro, setPriceEuro] = useState('');
  const [toDelete, setToDelete] = useState<ProductSpec | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'ok' | 'error'>('ok');

  function startEdit(p?: ProductSpec) {
    const base = p ? { ...p } : { ...empty };
    setEditing(base);
    setPriceEuro(p && p.pricePerPlateCents > 0 ? (p.pricePerPlateCents / 100).toFixed(2).replace('.', ',') : '');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setToast(null);
    try {
      const cents = Math.round(Number(priceEuro.replace(',', '.') || 0) * 100);
      const payload: ProductInput = { ...editing, pricePerPlateCents: Number.isFinite(cents) ? cents : 0, slug: editing.slug || editing.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') };
      if (editing.id) await admin.updateProduct(editing.id, payload);
      else await admin.createProduct(payload);
      setToastTone('ok');
      setToast('Produkt gespeichert.');
      setEditing(null);
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
      await admin.deleteProduct(toDelete.id);
      setToastTone('ok');
      setToast('Produkt gelöscht.');
      setToDelete(null);
      reload();
    } catch (err) {
      setToastTone('error');
      setToast(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  const num = (key: keyof ProductInput, label: string, step = 1, hint?: string) => (
    <Field label={label} required hint={hint}>
      {(p) => (
        <Input
          {...p}
          type="number"
          step={step}
          min={0}
          value={String(editing?.[key] ?? '')}
          onChange={(e) => setEditing((prev) => (prev ? { ...prev, [key]: Number(e.target.value) } : prev))}
        />
      )}
    </Field>
  );

  return (
    <>
      <PageHeader
        title="Produkte"
        text="Welche Platten angeboten werden und mit welchen Werten gerechnet wird. Preis 0 bedeutet: „Preis folgt nach Prüfung“."
        actions={
          <Button onClick={() => startEdit()} icon={<Plus className="size-5" aria-hidden />}>
            Neues Produkt
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
                <th className={t.th}>Produkt</th>
                <th className={t.th}>Maße</th>
                <th className={t.th}>Gewicht</th>
                <th className={t.th}>Traglast</th>
                <th className={t.th}>je Palette</th>
                <th className={t.th}>Preis je Platte</th>
                <th className={t.th}>Status</th>
                <th className={t.th}>
                  <span className="sr-only">Aktionen</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id}>
                  <td className={t.td}>
                    <span className="font-semibold text-gruen">{p.name}</span>
                    {p.material && <span className="block text-sm text-text">{p.material}</span>}
                  </td>
                  <td className={t.td}>
                    {p.lengthCm} × {p.widthCm} cm, {p.thicknessMm} mm
                  </td>
                  <td className={t.td}>{p.weightKg} kg</td>
                  <td className={t.td}>{p.loadCapacityTons} t</td>
                  <td className={t.td}>{p.platesPerPallet}</td>
                  <td className={t.td}>{p.pricePerPlateCents > 0 ? formatEuro(p.pricePerPlateCents) : 'nach Prüfung'}</td>
                  <td className={t.td}>
                    <div className="flex flex-col gap-1">
                      {p.isPlaceholder ? <PlaceholderBadge short /> : <Badge tone="green">Bestätigt</Badge>}
                      {p.active === false && <Badge>Inaktiv</Badge>}
                    </div>
                  </td>
                  <td className={t.td}>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(p)} icon={<Pencil className="size-4" aria-hidden />}>
                        Bearbeiten
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setToDelete(p)} aria-label={`${p.name} löschen`} icon={<Trash2 className="size-4" aria-hidden />} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Panel title={editing.id ? `„${editing.name}“ bearbeiten` : 'Neues Produkt'} className="mt-6">
          <form onSubmit={save} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name" required>
              {(p) => <Input {...p} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />}
            </Field>
            <Field label="Material">
              {(p) => <Input {...p} value={editing.material ?? ''} onChange={(e) => setEditing({ ...editing, material: e.target.value })} />}
            </Field>
            <Field label="Preis je Platte in Euro" hint="Leer oder 0 = Preis folgt nach Prüfung">
              {(p) => <Input {...p} inputMode="decimal" value={priceEuro} onChange={(e) => setPriceEuro(e.target.value)} placeholder="z. B. 89,00" />}
            </Field>
            {num('lengthCm', 'Länge in cm')}
            {num('widthCm', 'Breite in cm')}
            {num('thicknessMm', 'Stärke in mm')}
            {num('weightKg', 'Gewicht je Platte in kg', 0.1)}
            {num('platesPerPallet', 'Platten je Palette')}
            {num('loadCapacityTons', 'Traglast in Tonnen', 0.5)}
            {num('sortOrder', 'Reihenfolge', 1, 'Kleinere Zahl steht weiter oben')}
            <Field label="Beschreibung" className="sm:col-span-2">
              {(p) => <Textarea {...p} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />}
            </Field>
            <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="size-6 accent-gruen" checked={!editing.isPlaceholder} onChange={(e) => setEditing({ ...editing, isPlaceholder: !e.target.checked })} />
                <span className="font-semibold text-gruen">Daten von Mario bestätigt (Platzhalter-Hinweis entfernen)</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="size-6 accent-gruen" checked={editing.active !== false} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                <span className="font-semibold text-gruen">Aktiv (wird Kunden angeboten)</span>
              </label>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row lg:col-span-3">
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
                Abbrechen
              </Button>
              <Button type="submit" loading={busy}>
                Speichern
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <Dialog open={Boolean(toDelete)} title="Produkt löschen?" onClose={() => setToDelete(null)} confirmLabel="Löschen" confirmVariant="danger" loading={busy} onConfirm={remove}>
        <p>
          „{toDelete?.name}“ wird gelöscht. Bestehende Anfragen behalten ihre Berechnung. Tipp: Statt löschen kannst du das Produkt auch auf „inaktiv“ setzen.
        </p>
      </Dialog>
    </>
  );
}
