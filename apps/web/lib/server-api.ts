// Server-seitige Zugriffe auf die API (nur in Server-Komponenten). Fällt bei nicht erreichbarer API still auf Platzhalter zurück.
import 'server-only';
import type { ProductSpec } from './types';

const API_INTERNAL_URL = (process.env.API_INTERNAL_URL ?? 'http://localhost:4000').replace(/\/$/, '');

/** Platzhalter-Produkt, falls die API nicht antwortet (gleiche Werte wie der Seed, alle als Platzhalter markiert). */
export const FALLBACK_PRODUCT: ProductSpec = {
  id: 'classicxtreme',
  slug: 'classicxtreme',
  name: 'classicXtreme',
  description: 'Bodenschutzplatte aus 100 % Recycling-Kunststoff, hergestellt in der EU.',
  material: '100 % Recycling-Kunststoff',
  lengthCm: 240,
  widthCm: 120,
  thicknessMm: 15,
  weightKg: 38,
  platesPerPallet: 25,
  pricePerPlateCents: 0,
  loadCapacityTons: 40,
  isPlaceholder: true,
};

export async function fetchProductsServer(): Promise<{ products: ProductSpec[]; fromApi: boolean }> {
  if (process.env.NEXT_PUBLIC_MOCK_API === 'true') return { products: [FALLBACK_PRODUCT], fromApi: false };
  try {
    const res = await fetch(`${API_INTERNAL_URL}/api/products`, { cache: 'no-store', signal: AbortSignal.timeout(700) });
    if (!res.ok) throw new Error(String(res.status));
    const list = (await res.json()) as ProductSpec[];
    if (!Array.isArray(list) || list.length === 0) throw new Error('leer');
    return { products: list, fromApi: true };
  } catch {
    return { products: [FALLBACK_PRODUCT], fromApi: false };
  }
}
