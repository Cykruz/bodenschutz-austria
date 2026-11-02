import type { CalculationInput, CalculationResult, FreightZoneSpec, ProductSpec } from './types.js';

export const DEFAULT_WASTE_FACTOR = 1.05;
export const DEFAULT_LANE_COUNT = 2;

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function formatDe(value: number, decimals = 2): string {
  return value.toLocaleString('de-AT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function assertPositive(value: number | undefined, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} muss eine positive Zahl sein`);
  }
  return value;
}

/**
 * Findet die Frachtzone mit dem längsten passenden PLZ-Präfix.
 * Gibt undefined zurück, wenn keine Zone passt oder keine PLZ angegeben ist.
 */
export function findFreightZone(
  postalCode: string | undefined,
  zones: FreightZoneSpec[] | undefined,
): FreightZoneSpec | undefined {
  if (!postalCode || !zones || zones.length === 0) return undefined;
  const plz = postalCode.trim();
  if (plz.length === 0) return undefined;
  let best: FreightZoneSpec | undefined;
  let bestLen = 0;
  for (const zone of zones) {
    for (const rawPrefix of zone.postalPrefixes) {
      const prefix = rawPrefix.trim();
      if (prefix.length === 0) continue;
      if (plz.startsWith(prefix) && prefix.length > bestLen) {
        best = zone;
        bestLen = prefix.length;
      }
    }
  }
  return best;
}

export function calculate(input: CalculationInput, product: ProductSpec, zones?: FreightZoneSpec[]): CalculationResult {
  const wasteFactor = input.wasteFactor ?? DEFAULT_WASTE_FACTOR;
  if (!Number.isFinite(wasteFactor) || wasteFactor < 1) {
    throw new RangeError('wasteFactor muss >= 1 sein');
  }
  assertPositive(product.lengthCm, 'lengthCm');
  assertPositive(product.widthCm, 'widthCm');
  assertPositive(product.platesPerPallet, 'platesPerPallet');

  const plateWidthM = product.widthCm / 100;
  const plateLengthM = product.lengthCm / 100;
  const plateAreaM2 = plateWidthM * plateLengthM;
  const assumptions: string[] = [];

  let areaM2: number;
  if (input.mode === 'AREA') {
    areaM2 = assertPositive(input.areaM2, 'areaM2');
    assumptions.push(`Fläche laut Angabe: ${formatDe(areaM2)} m²`);
  } else {
    const lengthM = assertPositive(input.lengthM, 'lengthM');
    const laneWidthM = input.laneWidthM ?? plateWidthM;
    assertPositive(laneWidthM, 'laneWidthM');
    const laneCount = input.laneCount ?? DEFAULT_LANE_COUNT;
    assertPositive(laneCount, 'laneCount');
    areaM2 = lengthM * laneWidthM * laneCount;
    assumptions.push(
      `Fahrspuren: ${formatDe(lengthM)} m lang, ${laneCount} Spur(en) mit je ${formatDe(laneWidthM)} m Breite` +
        (input.laneWidthM === undefined ? ' (Spurbreite = Plattenbreite)' : '') +
        ` = ${formatDe(areaM2)} m²`,
    );
  }

  const plates = Math.ceil((areaM2 * wasteFactor) / plateAreaM2);
  const pallets = Math.ceil(plates / product.platesPerPallet);
  const weightKg = round(plates * product.weightKg, 1);

  const wastePercent = round((wasteFactor - 1) * 100, 1);
  assumptions.push(`${formatDe(wastePercent, wastePercent % 1 === 0 ? 0 : 1)} % Verschnitt/Überlappung eingerechnet`);
  assumptions.push(
    `Plattenmaß ${product.lengthCm} × ${product.widthCm} cm (${formatDe(plateAreaM2)} m² je Platte), ` +
      `${product.platesPerPallet} Platten je Palette`,
  );
  assumptions.push('Mengen aufgerundet auf ganze Platten und ganze Paletten');

  const result: CalculationResult = {
    areaM2: round(areaM2, 2),
    plates,
    pallets,
    weightKg,
    assumptions,
  };

  if (pallets >= 2 && plates % product.platesPerPallet !== 0) {
    const altPallets = Math.floor(plates / product.platesPerPallet);
    const altPlates = altPallets * product.platesPerPallet;
    const coveredAreaM2 = round(altPlates * plateAreaM2, 2);
    result.alternative = {
      pallets: altPallets,
      plates: altPlates,
      coveredAreaM2,
      note:
        `Alternative mit ${altPallets} vollen Palette(n) (${altPlates} Platten): deckt ca. ${formatDe(coveredAreaM2)} m² ` +
        'ohne Verschnittreserve ab. Nur sinnvoll, wenn die Fläche etwas kleiner ausfallen darf.',
    };
  }

  if (product.pricePerPlateCents > 0) {
    const zone = findFreightZone(input.postalCode, zones);
    const platesCents = plates * product.pricePerPlateCents;
    const freightCents = zone ? Math.max(zone.minimumCents, pallets * zone.pricePerPalletCents) : 0;
    const pricing: NonNullable<CalculationResult['pricing']> = {
      platesCents,
      freightCents,
      totalCents: platesCents + freightCents,
      isPreliminary: true,
      hasPlaceholderData: product.isPlaceholder || (zone?.isPlaceholder ?? false),
    };
    if (zone) {
      pricing.freightZone = zone.name;
      assumptions.push(`Fracht: Zone „${zone.name}“, ${pallets} Palette(n), Mindestfracht berücksichtigt`);
    } else {
      assumptions.push('Keine Frachtzone zur PLZ gefunden: Fracht wird nach Prüfung ergänzt');
    }
    assumptions.push('Alle Preise vorläufig und unverbindlich, netto');
    if (pricing.hasPlaceholderData) {
      assumptions.push('Preisbasis enthält Platzhalterdaten (noch zu bestätigen)');
    }
    result.pricing = pricing;
  } else {
    assumptions.push('Kein Listenpreis hinterlegt: Preis folgt nach Prüfung');
  }

  return result;
}
