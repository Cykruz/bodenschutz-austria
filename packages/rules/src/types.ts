export type ProjectType = 'CONSTRUCTION' | 'EVENT' | 'PADDOCK';
export type MeasureMode = 'AREA' | 'LANES';
export type Unloading = 'FORKLIFT' | 'CRANE_NEEDED' | 'UNKNOWN';

export interface ProductSpec {
  id: string;
  name: string;
  lengthCm: number;
  widthCm: number;
  thicknessMm: number;
  weightKg: number;
  platesPerPallet: number;
  pricePerPlateCents: number;
  loadCapacityTons: number;
  isPlaceholder: boolean;
}

export interface FreightZoneSpec {
  id: string;
  name: string;
  /** z. B. ['1','2'] für PLZ 1xxx, 2xxx */
  postalPrefixes: string[];
  pricePerPalletCents: number;
  minimumCents: number;
  isPlaceholder: boolean;
}

export interface CalculationInput {
  projectType: ProjectType;
  mode: MeasureMode;
  /** bei AREA */
  areaM2?: number;
  /** bei LANES */
  lengthM?: number;
  /** Standard: Plattenbreite in m */
  laneWidthM?: number;
  /** Standard: 2 */
  laneCount?: number;
  /** Standard 1.05 (5 % Verschnitt/Überlappung) */
  wasteFactor?: number;
  /** für Frachtzone */
  postalCode?: string;
}

export interface CalculationResult {
  /** effektive Fläche */
  areaM2: number;
  /** aufgerundet inkl. wasteFactor */
  plates: number;
  /** aufgerundet */
  pallets: number;
  weightKg: number;
  /** nur wenn pallets > 1 und letzte Palette nicht voll */
  alternative?: { pallets: number; plates: number; coveredAreaM2: number; note: string };
  pricing?: {
    platesCents: number;
    freightCents: number;
    totalCents: number;
    isPreliminary: true;
    hasPlaceholderData: boolean;
    freightZone?: string;
  };
  /** Klartext, z. B. „5 % Verschnitt eingerechnet“ */
  assumptions: string[];
}

export interface ClassificationInput {
  calculation: CalculationResult;
  unloading: Unloading;
  /** Freitext des Kunden */
  notes?: string;
  rentalRequested?: boolean;
  hasPhoto: boolean;
  /** Name, E-Mail, PLZ/Ort vorhanden */
  contactComplete: boolean;
  hasFreightZone: boolean;
}

export interface ClassificationThresholds {
  /** Standard 500 */
  maxStandardAreaM2: number;
  /** Standard 10 */
  maxStandardPallets: number;
}

export interface ClassificationResult {
  classification: 'STANDARD' | 'REVIEW';
  reasons: string[];
}
