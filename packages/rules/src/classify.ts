import type { ClassificationInput, ClassificationResult, ClassificationThresholds } from './types.js';

export const DEFAULT_THRESHOLDS: ClassificationThresholds = {
  maxStandardAreaM2: 500,
  maxStandardPallets: 10,
};

/** Signalwörter für Sonderwünsche im Freitext (Vergleich case-insensitiv). */
export const SPECIAL_REQUEST_SIGNALS: readonly string[] = [
  'Miete',
  'mieten',
  'leihen',
  'Sonder',
  'Rabatt',
  'Skonto',
  'dringend',
  'Eilauftrag',
  'Rahmenvertrag',
  'mehrere Baustellen',
  'Zahlungsziel',
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ');
}

/** Liefert die gefundenen Signalwörter (in der Schreibweise der Liste). */
export function findSignalWords(notes: string | undefined): string[] {
  if (!notes) return [];
  const text = normalize(notes);
  const found: string[] = [];
  for (const signal of SPECIAL_REQUEST_SIGNALS) {
    const needle = normalize(signal);
    if (needle === 'sonder') {
      // „besonders“ ist kein Sonderwunsch, „Sonderwunsch“/„Sondermaß“ schon
      if (/(^|[^a-zäöüß])sonder/.test(text)) found.push(signal);
      continue;
    }
    if (text.includes(needle)) found.push(signal);
  }
  return found;
}

export function classify(
  input: ClassificationInput,
  t: ClassificationThresholds = DEFAULT_THRESHOLDS,
): ClassificationResult {
  const reasons: string[] = [];
  const calc = input.calculation;

  if (input.rentalRequested) {
    reasons.push('Miete angefragt');
  }
  if (!input.contactComplete) {
    reasons.push('Kontaktdaten unvollständig (Name, E-Mail, PLZ/Ort)');
  }
  if (input.unloading === 'UNKNOWN') {
    reasons.push('Entladung unklar');
  } else if (input.unloading === 'CRANE_NEEDED') {
    reasons.push('Kran für Entladung nötig');
  }
  if (calc.areaM2 > t.maxStandardAreaM2) {
    reasons.push(`Fläche ${calc.areaM2} m² über Grenzwert ${t.maxStandardAreaM2} m²`);
  }
  if (calc.pallets > t.maxStandardPallets) {
    reasons.push(`${calc.pallets} Paletten über Grenzwert ${t.maxStandardPallets}`);
  }
  if (!input.hasFreightZone) {
    reasons.push('Keine Frachtzone zur PLZ gefunden');
  }
  const signals = findSignalWords(input.notes);
  if (signals.length > 0) {
    reasons.push(`Sonderwunsch im Freitext: ${signals.map((s) => `„${s}“`).join(', ')}`);
  }

  return { classification: reasons.length > 0 ? 'REVIEW' : 'STANDARD', reasons };
}
