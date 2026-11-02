import type { Classification, InquiryStatus, ProjectType, Unloading } from './types';

export function formatNumber(value: number, maxFractionDigits = 0): string {
  try {
    return new Intl.NumberFormat('de-AT', {
      maximumFractionDigits: maxFractionDigits,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    return String(Math.round(value * 10 ** maxFractionDigits) / 10 ** maxFractionDigits);
  }
}

export function formatEuroFromCents(cents: number): string {
  const euro = cents / 100;
  try {
    return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(euro);
  } catch {
    return `${euro.toFixed(2).replace('.', ',')} €`;
  }
}

export function formatWeight(kg: number): string {
  if (kg >= 1000) {
    return `${formatNumber(kg / 1000, 1)} t`;
  }
  return `${formatNumber(kg)} kg`;
}

export function formatArea(m2: number): string {
  return `${formatNumber(m2, 1)} m²`;
}

/** Deutsches Dezimalkomma akzeptieren. */
export function parseDecimal(input: string): number | undefined {
  const cleaned = input.trim().replace(/\s/g, '').replace(',', '.');
  if (cleaned === '') return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

export const projectTypeLabel: Record<ProjectType, string> = {
  CONSTRUCTION: 'Baustelle',
  EVENT: 'Veranstaltung',
  PADDOCK: 'Paddock',
};

export const unloadingLabel: Record<Unloading, string> = {
  FORKLIFT: 'Stapler vorhanden',
  CRANE_NEEDED: 'Kran nötig',
  UNKNOWN: 'Noch unklar',
};

export const statusLabel: Record<InquiryStatus, string> = {
  NEW: 'Eingegangen',
  DRAFT: 'In Vorbereitung',
  QUESTION: 'Rückfrage offen',
  APPROVED: 'Freigegeben',
  SENT: 'Angebot gesendet',
  REJECTED: 'Abgelehnt',
};

export const statusDescription: Record<InquiryStatus, string> = {
  NEW: 'Ihre Anfrage ist bei uns angekommen und wartet auf die Prüfung.',
  DRAFT: 'Ein Angebotsentwurf wird vorbereitet und persönlich geprüft.',
  QUESTION: 'Wir haben eine Rückfrage an Sie gesendet. Bitte prüfen Sie Ihr E-Mail-Postfach.',
  APPROVED: 'Ihre Anfrage wurde geprüft und freigegeben. Das Angebot folgt in Kürze.',
  SENT: 'Das Angebot wurde per E-Mail an Sie gesendet.',
  REJECTED: 'Diese Anfrage konnte leider nicht weiterbearbeitet werden. Bitte melden Sie sich bei uns.',
};

export const classificationLabel: Record<Classification, string> = {
  STANDARD: 'Standardfall: wird automatisch vorbereitet und von uns geprüft.',
  REVIEW: 'Prüffall: wird persönlich geprüft, bevor ein Angebot entsteht.',
};

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat('de-AT', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  } catch {
    return date.toLocaleString();
  }
}
