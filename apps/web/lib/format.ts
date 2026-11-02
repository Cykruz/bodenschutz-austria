export function formatEuro(cents: number): string {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat('de-AT', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
}

export function formatKg(kg: number): string {
  if (kg >= 1000) return `${formatNumber(kg / 1000, 1)} t`;
  return `${formatNumber(kg)} kg`;
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '–';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '–';
  return new Intl.DateTimeFormat('de-AT', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

export function parseJson<T>(value: T | string | null | undefined, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
