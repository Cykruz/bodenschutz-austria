// Zentrale Angaben zu Betreiber und Website (aus docs/RECHERCHE.md)

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const SITE_NAME = 'Bodenschutz Austria';
export const SITE_CLAIM = 'Vom Foto zum Angebot';
export const SITE_DESCRIPTION =
  'Bodenschutzplatten aus 100 % Recycling-Kunststoff für Baustellen, Veranstaltungen und Paddocks. Vorhaben beschreiben, Mengen ansehen, Angebot anfragen – direkt online, ohne App.';

export const OPERATOR = {
  company: 'Ari Schlemmer Handel & Tech-Consulting e.U.',
  owner: 'Ari Schlemmer',
  street: 'Westbahnstr. 21',
  postalCode: '3362',
  city: 'Mauer/Amstetten',
  country: 'Österreich',
  phone: '+43 660 7602201',
  phoneHref: 'tel:+436607602201',
  email: 'info@bodenschutz-austria.at',
  emailHref: 'mailto:info@bodenschutz-austria.at',
  website: 'https://bodenschutz-austria.at',
} as const;

export const PLACEHOLDER = {
  uid: '[UID-NUMMER]',
  firmenbuch: '[FIRMENBUCHNUMMER]',
  gericht: '[FIRMENBUCHGERICHT]',
  kammer: '[KAMMERZUGEHÖRIGKEIT, z. B. WKO Niederösterreich]',
  gewerbe: '[GEWERBE, z. B. Handelsgewerbe]',
  aufsicht: 'Bezirkshauptmannschaft Amstetten [BITTE BESTÄTIGEN]',
  playStore: '[PLAY-STORE-LINK]',
  appStore: '[APP-STORE-LINK]',
} as const;

export const ANDROID_APK_URL = process.env.NEXT_PUBLIC_ANDROID_APK_URL ?? '';

export const PRODUCT_NAME = 'classicXtreme';

export const NAV_LINKS = [
  { href: '/anfrage', label: 'Angebot anfragen' },
  { href: '/app', label: 'App' },
  { href: '/ki-hinweis', label: 'KI-Hinweis' },
] as const;

export const LEGAL_LINKS = [
  { href: '/impressum', label: 'Impressum' },
  { href: '/datenschutz', label: 'Datenschutz' },
  { href: '/ki-hinweis', label: 'KI-Hinweis' },
] as const;

export const PRINCIPLES = {
  noOrder: 'Eine Anfrage ist noch keine Bestellung.',
  noSurvey: 'Ein Foto ersetzt keine Vermessung und keine Prüfung der Tragfähigkeit.',
  pricesLater: 'Verlässliche Preise und Versandkosten gibt es erst mit vollständigen, freigegebenen Daten.',
  aiDisclosure: 'Du sprichst mit einem KI-Assistenten von Bodenschutz Austria.',
} as const;

export const PROJECT_TYPE_LABELS: Record<'CONSTRUCTION' | 'EVENT' | 'PADDOCK', string> = {
  CONSTRUCTION: 'Baustelle',
  EVENT: 'Veranstaltung',
  PADDOCK: 'Paddock',
};

export const UNLOADING_LABELS: Record<'FORKLIFT' | 'CRANE_NEEDED' | 'UNKNOWN', string> = {
  FORKLIFT: 'Stapler vorhanden',
  CRANE_NEEDED: 'Kran nötig',
  UNKNOWN: 'Weiß ich nicht',
};

export const STATUS_LABELS: Record<string, string> = {
  NEW: 'Neu',
  DRAFT: 'Entwurf',
  QUESTION: 'Rückfrage gestellt',
  APPROVED: 'Freigegeben',
  SENT: 'Gesendet',
  REJECTED: 'Abgelehnt',
  IGNORED: 'Ignoriert',
};

export const CLASSIFICATION_LABELS: Record<string, string> = {
  STANDARD: 'Standardfall',
  REVIEW: 'Prüffall',
};
