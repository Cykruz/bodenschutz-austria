import { describe, expect, it } from 'vitest';
import { classify, findSignalWords, type CalculationResult, type ClassificationInput } from '../src/index.js';

const calc: CalculationResult = {
  areaM2: 100,
  plates: 37,
  pallets: 2,
  weightKg: 1406,
  assumptions: [],
};

const standard: ClassificationInput = {
  calculation: calc,
  unloading: 'FORKLIFT',
  hasPhoto: true,
  contactComplete: true,
  hasFreightZone: true,
};

describe('classify', () => {
  it('stuft einen sauberen Standardfall als STANDARD ein', () => {
    const r = classify(standard);
    expect(r.classification).toBe('STANDARD');
    expect(r.reasons).toEqual([]);
  });

  it('REVIEW bei Miete', () => {
    const r = classify({ ...standard, rentalRequested: true });
    expect(r.classification).toBe('REVIEW');
    expect(r.reasons.join()).toContain('Miete');
  });

  it('REVIEW bei unvollständigen Kontaktdaten', () => {
    const r = classify({ ...standard, contactComplete: false });
    expect(r.classification).toBe('REVIEW');
    expect(r.reasons.join()).toContain('Kontaktdaten');
  });

  it('REVIEW bei unklarer Entladung oder Kran', () => {
    expect(classify({ ...standard, unloading: 'UNKNOWN' }).reasons.join()).toContain('Entladung unklar');
    expect(classify({ ...standard, unloading: 'CRANE_NEEDED' }).reasons.join()).toContain('Kran');
  });

  it('REVIEW bei Fläche über Grenzwert (Standard 500 m²)', () => {
    const r = classify({ ...standard, calculation: { ...calc, areaM2: 501 } });
    expect(r.classification).toBe('REVIEW');
    expect(r.reasons.join()).toContain('Fläche');
    expect(classify({ ...standard, calculation: { ...calc, areaM2: 500 } }).classification).toBe('STANDARD');
  });

  it('REVIEW bei Paletten über Grenzwert (Standard 10)', () => {
    const r = classify({ ...standard, calculation: { ...calc, pallets: 11 } });
    expect(r.classification).toBe('REVIEW');
    expect(r.reasons.join()).toContain('Paletten');
  });

  it('respektiert eigene Grenzwerte', () => {
    const r = classify({ ...standard, calculation: { ...calc, areaM2: 120, pallets: 3 } }, { maxStandardAreaM2: 100, maxStandardPallets: 2 });
    expect(r.classification).toBe('REVIEW');
    expect(r.reasons).toHaveLength(2);
  });

  it('REVIEW ohne Frachtzone', () => {
    const r = classify({ ...standard, hasFreightZone: false });
    expect(r.classification).toBe('REVIEW');
    expect(r.reasons.join()).toContain('Frachtzone');
  });

  it('REVIEW bei Signalwörtern im Freitext, case-insensitiv', () => {
    for (const text of ['Bitte RABATT', 'brauche das dringend', 'Können wir die Platten mieten?', 'Sondermaß nötig', 'Angebot für mehrere Baustellen', 'Zahlungsziel 60 Tage', 'Eilauftrag!', 'Rahmenvertrag gewünscht', 'skonto?', 'leihen möglich?']) {
      const r = classify({ ...standard, notes: text });
      expect(r.classification, text).toBe('REVIEW');
      expect(r.reasons.join(), text).toContain('Sonderwunsch');
    }
  });

  it('ignoriert unauffälligen Freitext und „besonders“', () => {
    expect(classify({ ...standard, notes: 'Zufahrt über den Hof, besonders eben.' }).classification).toBe('STANDARD');
    expect(findSignalWords('Alles besonders schön')).toEqual([]);
    expect(findSignalWords(undefined)).toEqual([]);
  });

  it('sammelt mehrere Gründe', () => {
    const r = classify({
      ...standard,
      rentalRequested: true,
      unloading: 'UNKNOWN',
      hasFreightZone: false,
      notes: 'dringend',
      calculation: { ...calc, pallets: 12 },
    });
    expect(r.classification).toBe('REVIEW');
    expect(r.reasons.length).toBe(5);
  });

  it('ist deterministisch', () => {
    const input = { ...standard, notes: 'Rabatt?' };
    expect(classify(input)).toEqual(classify(input));
  });
});
