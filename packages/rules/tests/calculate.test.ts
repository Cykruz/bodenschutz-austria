import { describe, expect, it } from 'vitest';
import { calculate, findFreightZone, type FreightZoneSpec, type ProductSpec } from '../src/index.js';

const product: ProductSpec = {
  id: 'p1',
  name: 'classicXtreme',
  lengthCm: 240,
  widthCm: 120,
  thicknessMm: 15,
  weightKg: 38,
  platesPerPallet: 25,
  pricePerPlateCents: 8900,
  loadCapacityTons: 40,
  isPlaceholder: true,
};
const realProduct: ProductSpec = { ...product, id: 'p2', isPlaceholder: false };
const freeProduct: ProductSpec = { ...product, id: 'p3', pricePerPlateCents: 0 };

const zones: FreightZoneSpec[] = [
  { id: 'ost', name: 'Ost', postalPrefixes: ['1', '2', '3', '7'], pricePerPalletCents: 9000, minimumCents: 15000, isPlaceholder: false },
  { id: 'sued', name: 'Süd', postalPrefixes: ['8', '9'], pricePerPalletCents: 11000, minimumCents: 18000, isPlaceholder: true },
  { id: 'wien', name: 'Wien', postalPrefixes: ['10', '11'], pricePerPalletCents: 7000, minimumCents: 12000, isPlaceholder: false },
];

describe('calculate – Fläche', () => {
  it('rechnet Fläche mit 5 % Verschnitt und rundet Platten und Paletten auf', () => {
    // 100 m² × 1.05 / 2.88 m² = 36.46 → 37 Platten → 2 Paletten
    const r = calculate({ projectType: 'CONSTRUCTION', mode: 'AREA', areaM2: 100 }, product);
    expect(r.areaM2).toBe(100);
    expect(r.plates).toBe(37);
    expect(r.pallets).toBe(2);
    expect(r.weightKg).toBe(37 * 38);
    expect(r.assumptions.some((a) => a.includes('5 % Verschnitt'))).toBe(true);
  });

  it('respektiert einen eigenen wasteFactor', () => {
    const r = calculate({ projectType: 'EVENT', mode: 'AREA', areaM2: 100, wasteFactor: 1 }, product);
    expect(r.plates).toBe(35); // 100 / 2.88 = 34.7 → 35
    expect(r.assumptions.some((a) => a.includes('0 % Verschnitt'))).toBe(true);
  });

  it('wirft bei fehlender oder ungültiger Fläche', () => {
    expect(() => calculate({ projectType: 'EVENT', mode: 'AREA' }, product)).toThrow(RangeError);
    expect(() => calculate({ projectType: 'EVENT', mode: 'AREA', areaM2: -5 }, product)).toThrow(RangeError);
    expect(() => calculate({ projectType: 'EVENT', mode: 'AREA', areaM2: 10, wasteFactor: 0.5 }, product)).toThrow(RangeError);
  });

  it('ist deterministisch', () => {
    const input = { projectType: 'PADDOCK' as const, mode: 'AREA' as const, areaM2: 73.3, postalCode: '8010' };
    expect(calculate(input, product, zones)).toEqual(calculate(input, product, zones));
  });
});

describe('calculate – Fahrspuren', () => {
  it('nutzt Plattenbreite und 2 Spuren als Standard', () => {
    // 50 m × 1.2 m × 2 = 120 m² → ×1.05 / 2.88 = 43.75 → 44 Platten → 2 Paletten
    const r = calculate({ projectType: 'CONSTRUCTION', mode: 'LANES', lengthM: 50 }, product);
    expect(r.areaM2).toBe(120);
    expect(r.plates).toBe(44);
    expect(r.pallets).toBe(2);
    expect(r.assumptions.some((a) => a.includes('Spurbreite = Plattenbreite'))).toBe(true);
  });

  it('übernimmt eigene Spurbreite und Spuranzahl', () => {
    const r = calculate({ projectType: 'CONSTRUCTION', mode: 'LANES', lengthM: 30, laneWidthM: 2.4, laneCount: 1 }, product);
    expect(r.areaM2).toBe(72);
    expect(r.plates).toBe(Math.ceil((72 * 1.05) / 2.88));
  });

  it('wirft ohne Länge', () => {
    expect(() => calculate({ projectType: 'CONSTRUCTION', mode: 'LANES' }, product)).toThrow(RangeError);
  });
});

describe('calculate – Alternative', () => {
  it('bietet eine Alternative mit vollen Paletten, wenn die letzte Palette nicht voll ist', () => {
    const r = calculate({ projectType: 'CONSTRUCTION', mode: 'AREA', areaM2: 100 }, product); // 37 Platten, 2 Paletten
    expect(r.alternative).toBeDefined();
    expect(r.alternative?.pallets).toBe(1);
    expect(r.alternative?.plates).toBe(25);
    expect(r.alternative?.coveredAreaM2).toBe(72); // 25 × 2.88, ohne Verschnitt
    expect(r.alternative?.note).toContain('Alternative');
  });

  it('bietet keine Alternative bei nur einer Palette', () => {
    const r = calculate({ projectType: 'EVENT', mode: 'AREA', areaM2: 20 }, product);
    expect(r.pallets).toBe(1);
    expect(r.alternative).toBeUndefined();
  });

  it('bietet keine Alternative, wenn die Paletten genau voll sind', () => {
    // 50 Platten = 2 volle Paletten: 50 × 2.88 / 1.05 = 137.14 m²
    const r = calculate({ projectType: 'EVENT', mode: 'AREA', areaM2: 137.14, wasteFactor: 1.05 }, product);
    expect(r.plates).toBe(50);
    expect(r.pallets).toBe(2);
    expect(r.alternative).toBeUndefined();
  });
});

describe('calculate – Preise und Frachtzonen', () => {
  it('rechnet Platten- und Frachtpreis mit passender Zone', () => {
    const r = calculate({ projectType: 'CONSTRUCTION', mode: 'AREA', areaM2: 100, postalCode: '3362' }, realProduct, zones);
    expect(r.pricing).toBeDefined();
    expect(r.pricing?.platesCents).toBe(37 * 8900);
    expect(r.pricing?.freightCents).toBe(Math.max(15000, 2 * 9000)); // 18000
    expect(r.pricing?.totalCents).toBe(37 * 8900 + 18000);
    expect(r.pricing?.freightZone).toBe('Ost');
    expect(r.pricing?.isPreliminary).toBe(true);
    expect(r.pricing?.hasPlaceholderData).toBe(false);
  });

  it('wendet die Mindestfracht an', () => {
    const r = calculate({ projectType: 'EVENT', mode: 'AREA', areaM2: 20, postalCode: '2000' }, realProduct, zones);
    expect(r.pallets).toBe(1);
    expect(r.pricing?.freightCents).toBe(15000);
  });

  it('wählt die Zone mit dem längsten passenden Präfix', () => {
    const r = calculate({ projectType: 'EVENT', mode: 'AREA', areaM2: 20, postalCode: '1010' }, realProduct, zones);
    expect(r.pricing?.freightZone).toBe('Wien');
    expect(findFreightZone('1010', zones)?.id).toBe('wien');
    expect(findFreightZone('1230', zones)?.id).toBe('ost');
    expect(findFreightZone('4020', zones)).toBeUndefined();
  });

  it('setzt Fracht 0 ohne passende Zone und lässt freightZone weg', () => {
    const r = calculate({ projectType: 'EVENT', mode: 'AREA', areaM2: 20, postalCode: '4020' }, realProduct, zones);
    expect(r.pricing?.freightCents).toBe(0);
    expect(r.pricing?.freightZone).toBeUndefined();
    expect(r.pricing?.totalCents).toBe(r.pricing?.platesCents);
  });

  it('liefert keine Preise ohne Listenpreis', () => {
    const r = calculate({ projectType: 'EVENT', mode: 'AREA', areaM2: 20, postalCode: '1010' }, freeProduct, zones);
    expect(r.pricing).toBeUndefined();
    expect(r.assumptions.some((a) => a.includes('Preis folgt nach Prüfung'))).toBe(true);
  });

  it('markiert Platzhalterdaten aus Produkt oder Zone', () => {
    const viaProduct = calculate({ projectType: 'EVENT', mode: 'AREA', areaM2: 20, postalCode: '1010' }, product, zones);
    expect(viaProduct.pricing?.hasPlaceholderData).toBe(true);
    const viaZone = calculate({ projectType: 'EVENT', mode: 'AREA', areaM2: 20, postalCode: '8010' }, realProduct, zones);
    expect(viaZone.pricing?.hasPlaceholderData).toBe(true);
    const none = calculate({ projectType: 'EVENT', mode: 'AREA', areaM2: 20, postalCode: '1010' }, realProduct, zones);
    expect(none.pricing?.hasPlaceholderData).toBe(false);
  });
});
