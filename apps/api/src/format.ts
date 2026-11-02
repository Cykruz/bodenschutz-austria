import type { CalculationResult } from '@bodenschutz/rules';
import type { Inquiry, Product } from '@prisma/client';

export const PROJECT_TYPE_LABEL: Record<string, string> = {
  CONSTRUCTION: 'Baustelle / Industrie',
  EVENT: 'Event / Kommune',
  PADDOCK: 'Paddock / Reitsport',
};

export const UNLOADING_LABEL: Record<string, string> = {
  FORKLIFT: 'Stapler vor Ort',
  CRANE_NEEDED: 'Kran nötig',
  UNKNOWN: 'noch unklar',
};

export function euro(cents: number): string {
  return (cents / 100).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' }).replace('€', 'EUR').trim();
}

export function num(value: number, decimals = 2): string {
  return value.toLocaleString('de-AT', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

export function parseCalculation(inquiry: Pick<Inquiry, 'calculation'>): CalculationResult {
  return JSON.parse(inquiry.calculation) as CalculationResult;
}

export function parseReasons(inquiry: Pick<Inquiry, 'reviewReasons'>): string[] {
  try {
    const v = JSON.parse(inquiry.reviewReasons) as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/** Beschreibt das Vorhaben in einem Satz (für Entwürfe und PDF). */
export function describeMeasures(inquiry: Inquiry): string {
  if (inquiry.mode === 'LANES') {
    const parts = [`${num(inquiry.lengthM ?? 0)} m Länge`];
    if (inquiry.laneWidthM) parts.push(`${num(inquiry.laneWidthM)} m Spurbreite`);
    parts.push(`${inquiry.laneCount ?? 2} Fahrspur(en)`);
    return `Fahrspuren: ${parts.join(', ')}`;
  }
  return `Fläche: ${num(inquiry.areaM2 ?? 0)} m²`;
}

/** Deterministische Zusammenfassung der Mengen (Basis für Vorlagentexte und KI-Prompts). */
export function summarizeCalculation(calc: CalculationResult, product: Product): string[] {
  const lines = [
    `Produkt: ${product.name} (${num(product.lengthCm)} × ${num(product.widthCm)} cm, ${num(product.thicknessMm)} mm, ` +
      `${num(product.weightKg)} kg je Platte, Traglast ca. ${num(product.loadCapacityTons)} t)`,
    `Effektive Fläche: ${num(calc.areaM2)} m²`,
    `Platten: ${calc.plates} Stück (inkl. Verschnitt/Überlappung)`,
    `Paletten: ${calc.pallets} (${product.platesPerPallet} Platten je Palette)`,
    `Gesamtgewicht: ca. ${num(calc.weightKg, 0)} kg`,
  ];
  if (calc.alternative) {
    lines.push(`Alternative: ${calc.alternative.note}`);
  }
  return lines;
}

export function summarizePricing(calc: CalculationResult): string[] {
  const p = calc.pricing;
  if (!p) return ['Preis folgt nach Prüfung (kein Listenpreis hinterlegt)'];
  if (p.hasPlaceholderData) return ['Preis folgt nach Prüfung durch Bodenschutz Austria'];
  const lines = [
    `Platten: ${euro(p.platesCents)} (vorläufig, unverbindlich)`,
    p.freightZone
      ? `Fracht (Zone ${p.freightZone}): ${euro(p.freightCents)} (vorläufig, unverbindlich)`
      : 'Fracht: wird nach Prüfung der Lieferadresse ergänzt',
    `Summe netto: ${euro(p.totalCents)} (vorläufig, unverbindlich)`,
  ];
  return lines;
}
