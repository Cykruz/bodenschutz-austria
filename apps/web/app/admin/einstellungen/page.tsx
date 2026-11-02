'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { admin, describeError } from '@/lib/api';
import type { Settings } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { Spinner } from '@/components/ui/Spinner';
import { PageHeader, Panel, Toast, useLoad } from '@/components/admin/shared';

const FIELDS: { key: string; label: string; hint: string; type?: 'number' | 'text'; step?: string }[] = [
  { key: 'companyName', label: 'Firmenname in E-Mails und PDF', hint: 'Erscheint als Absender und im Angebot.' },
  { key: 'companyEmail', label: 'Kontakt-E-Mail', hint: 'Antwortadresse für Kunden.' },
  { key: 'companyPhone', label: 'Telefon', hint: 'Steht im Angebot und in Rückfragen.' },
  { key: 'maxStandardAreaM2', label: 'Grenzwert Fläche für Standardfall (m²)', hint: 'Größere Flächen werden zum Prüffall. Standard 500.', type: 'number' },
  { key: 'maxStandardPallets', label: 'Grenzwert Paletten für Standardfall', hint: 'Mehr Paletten werden zum Prüffall. Standard 10.', type: 'number' },
  { key: 'wasteFactor', label: 'Verschnitt-Faktor', hint: '1,05 bedeutet 5 % Reserve für Verschnitt und Überlappung.', type: 'number', step: '0.01' },
];

export default function EinstellungenPage() {
  const { data, error, loading, setData } = useLoad(() => admin.settings());
  const [form, setForm] = useState<Settings>({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'ok' | 'error'>('ok');

  const [syncedFrom, setSyncedFrom] = useState<Settings | null>(null);
  if (data && data !== syncedFrom) {
    setSyncedFrom(data);
    setForm(data);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setToast(null);
    try {
      const payload: Settings = {};
      for (const f of FIELDS) payload[f.key] = String(form[f.key] ?? '').trim().replace(',', '.');
      const res = await admin.updateSettings(payload);
      setData({ ...form, ...res });
      setToastTone('ok');
      setToast('Einstellungen gespeichert.');
    } catch (err) {
      setToastTone('error');
      setToast(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Einstellungen" text="Firmendaten und Grenzwerte für die Einstufung. Der Schalter für den automatischen Versand liegt in der Übersicht." />
      {error && <Notice tone="error">{error}</Notice>}
      {loading && <Spinner />}
      {data && (
        <Panel>
          <form onSubmit={save} className="grid gap-5 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint} required>
                {(p) => (
                  <Input
                    {...p}
                    type={f.type === 'number' ? 'text' : 'text'}
                    inputMode={f.type === 'number' ? 'decimal' : undefined}
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                )}
              </Field>
            ))}
            <div className="sm:col-span-2">
              <Button type="submit" loading={busy} icon={<Save className="size-5" aria-hidden />}>
                Speichern
              </Button>
              <Toast message={toast} tone={toastTone} />
            </div>
          </form>
          <p className="mt-6 text-sm text-text">
            Automatischer Versand: <strong>{data.autoSendEnabled === 'true' ? 'eingeschaltet' : 'ausgeschaltet'}</strong> (Änderung in der Übersicht).
          </p>
        </Panel>
      )}
    </>
  );
}
