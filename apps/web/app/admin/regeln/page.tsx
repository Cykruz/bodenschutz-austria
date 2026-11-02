'use client';

import { useState } from 'react';
import { admin, describeError } from '@/lib/api';
import { Toggle } from '@/components/ui/Toggle';
import { Notice } from '@/components/ui/Notice';
import { Spinner } from '@/components/ui/Spinner';
import { PageHeader, Toast, useLoad } from '@/components/admin/shared';

const EXPLAIN: Record<string, string> = {
  inquiry_confirmation: 'Der Kunde bekommt sofort nach dem Absenden eine kurze Eingangsbestätigung. Enthält keine Preise. Risikoarm, aber erst nach einem Testlauf einschalten.',
  standard_offer_send: 'Nur für Anfragen, die nach festen Regeln als Standardfall gelten: alle Angaben vollständig, Stapler vorhanden, Fläche und Paletten unter dem Grenzwert, keine Miete, keine Sonderwünsche. Prüffälle bleiben immer bei dir.',
  standard_email_reply: 'Eingehende E-Mails, die als Standardfall eingestuft wurden, werden automatisch beantwortet. Alles andere wartet als Entwurf im Posteingang.',
};

export default function RegelnPage() {
  const { data, setData, error, loading } = useLoad(() => Promise.all([admin.rules(), admin.settings()]));
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'ok' | 'error'>('ok');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const rules = data?.[0] ?? [];
  const autoSend = data?.[1]?.autoSendEnabled === 'true';

  async function toggle(key: string, next: boolean) {
    if (!data) return;
    setBusyKey(key);
    try {
      const updated = await admin.updateRule(key, next);
      setData([rules.map((r) => (r.key === key ? { ...r, ...updated, autoAllowed: next } : r)), data[1]]);
      setToastTone('ok');
      setToast(next ? 'Regel darf jetzt automatisch laufen (sobald der automatische Versand eingeschaltet ist).' : 'Regel wartet wieder auf deine Freigabe.');
    } catch (err) {
      setToastTone('error');
      setToast(describeError(err));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <>
      <PageHeader title="Regeln" text="Welche Anfragen automatisch laufen dürfen und welche persönlich geprüft werden." />
      <Notice tone="info" title="Erst unterstützen, dann automatisieren." className="mb-6">
        Empfehlung: Zuerst nur Entwürfe mit persönlicher Freigabe. Erst wenn Standardfälle über Wochen zuverlässig passen, einzelne Regeln freigeben. Eine Regel wirkt nur, wenn zusätzlich der
        Hauptschalter „Automatischer Versand“ in der Übersicht eingeschaltet ist
        {autoSend ? <strong> (derzeit eingeschaltet)</strong> : <> (derzeit ausgeschaltet)</>}.
      </Notice>
      {error && <Notice tone="error">{error}</Notice>}
      {loading && <Spinner />}
      <Toast message={toast} tone={toastTone} />

      <ul className="mt-4 space-y-4">
        {rules.map((r) => (
          <li key={r.key} className={`karte p-5 sm:p-6 ${r.autoAllowed ? 'border-akzent' : ''}`}>
            <Toggle
              checked={r.autoAllowed}
              onChange={(v) => toggle(r.key, v)}
              disabled={busyKey === r.key}
              warn
              label={r.label}
              description={r.description}
            />
            <p className="mt-3 border-t border-linie pt-3 text-sm text-text">{EXPLAIN[r.key] ?? 'Automatik nur für klar definierte Fälle; alles andere bleibt bei dir.'}</p>
            <p className="mt-2 text-sm font-semibold text-gruen">{r.autoAllowed ? (autoSend ? 'Läuft automatisch.' : 'Freigegeben, wartet auf den Hauptschalter.') : 'Wartet auf deine persönliche Freigabe.'}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
