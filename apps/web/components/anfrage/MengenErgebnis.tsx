'use client';

import { useState } from 'react';
import { ChevronDown, Layers, Package, Scale, Square } from 'lucide-react';
import { formatEuro, formatKg, formatNumber } from '@/lib/format';
import { CountUp } from '@/components/ui/CountUp';
import type { CalculationResult, ProductSpec } from '@/lib/types';
import { Notice } from '@/components/ui/Notice';
import { PlaceholderBadge } from '@/components/ui/Badge';

export function MengenErgebnis({ result, product, compact }: { result: CalculationResult; product?: ProductSpec | null; compact?: boolean }) {
  const [openAssumptions, setOpenAssumptions] = useState(false);
  const cells = [
    { icon: Square, label: 'Fläche', value: result.areaM2, format: (n: number) => `${formatNumber(n, 1)} m²` },
    { icon: Layers, label: 'Platten', value: result.plates, format: (n: number) => formatNumber(Math.round(n)) },
    { icon: Package, label: 'Paletten', value: result.pallets, format: (n: number) => formatNumber(Math.round(n)) },
    { icon: Scale, label: 'Gewicht', value: result.weightKg, format: (n: number) => formatKg(n) },
  ];
  return (
    <div className="space-y-4">
      <dl className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {cells.map(({ icon: Icon, label, value, format }) => (
          <div key={label} className="tilt rounded-2xl bg-salbei px-4 py-4 text-center">
            <Icon className="mx-auto size-6 text-gruen" aria-hidden />
            <dt className="mt-1 text-sm font-semibold text-text">{label}</dt>
            <dd className="font-heading text-2xl font-extrabold text-gruen tabular-nums">
              <CountUp value={value} format={format} />
            </dd>
          </div>
        ))}
      </dl>

      {product && (
        <p className="text-sm text-text">
          Produkt: <strong className="text-gruen">{product.name}</strong> ({product.lengthCm} × {product.widthCm} cm, {product.platesPerPallet} Platten je Palette)
          {product.isPlaceholder && (
            <>
              {' '}
              <PlaceholderBadge short />
            </>
          )}
        </p>
      )}

      {result.alternative && (
        <Notice tone="info" title={`Alternative: ${result.alternative.pallets} volle ${result.alternative.pallets === 1 ? 'Palette' : 'Paletten'}`}>
          {result.alternative.plates} Platten decken etwa {formatNumber(result.alternative.coveredAreaM2)} m² ab. {result.alternative.note}
        </Notice>
      )}

      <div className="rounded-2xl border border-linie bg-white px-5 py-4">
        {result.pricing ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-heading text-lg font-extrabold text-gruen">Vorläufiger Preis</span>
              <span className="font-heading text-2xl font-extrabold text-gruen">{formatEuro(result.pricing.totalCents)}</span>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-text">
              <li className="flex justify-between">
                <span>Platten</span>
                <span>{formatEuro(result.pricing.platesCents)}</span>
              </li>
              <li className="flex justify-between">
                <span>Fracht{result.pricing.freightZone ? ` (${result.pricing.freightZone})` : ''}</span>
                <span>{result.pricing.freightCents > 0 ? formatEuro(result.pricing.freightCents) : 'nach Prüfung'}</span>
              </li>
            </ul>
            <p className="mt-3 text-sm font-semibold text-terracotta-text">
              Vorläufig. Verbindlich wird der Preis erst im geprüften Angebot.
              {result.pricing.hasPlaceholderData && ' Enthält Platzhalterdaten.'}
            </p>
          </>
        ) : (
          <>
            <p className="font-heading text-lg font-extrabold text-gruen">Preis folgt nach Prüfung</p>
            <p className="mt-1 text-sm text-text">Verlässliche Preise und Versandkosten gibt es erst mit vollständigen, freigegebenen Daten.</p>
          </>
        )}
      </div>

      {result.assumptions.length > 0 && (
        <div className="rounded-2xl border border-linie bg-white">
          <button
            type="button"
            onClick={() => setOpenAssumptions((o) => !o)}
            aria-expanded={openAssumptions}
            className="touch flex w-full items-center justify-between px-5 py-3 text-left font-semibold text-gruen"
          >
            Annahmen der Berechnung
            <ChevronDown className={`size-5 transition-transform ${openAssumptions ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {openAssumptions && (
            <ul className="space-y-1 border-t border-linie px-5 py-3 text-sm text-text">
              {result.assumptions.map((a) => (
                <li key={a} className="flex gap-2">
                  <span aria-hidden>•</span>
                  {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
