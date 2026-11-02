import type { PrismaClient } from '@prisma/client';

export const SETTING_KEYS = [
  'autoSendEnabled',
  'maxStandardAreaM2',
  'maxStandardPallets',
  'wasteFactor',
  'companyName',
  'companyEmail',
  'companyPhone',
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export const DEFAULT_SETTINGS: Record<SettingKey, string> = {
  autoSendEnabled: 'false',
  maxStandardAreaM2: '500',
  maxStandardPallets: '10',
  wasteFactor: '1.05',
  companyName: 'Bodenschutz Austria',
  companyEmail: 'info@bodenschutz-austria.at',
  companyPhone: '+43 660 7602201',
};

export interface AppSettings {
  autoSendEnabled: boolean;
  maxStandardAreaM2: number;
  maxStandardPallets: number;
  wasteFactor: number;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  /** Rohwerte wie in der Datenbank */
  raw: Record<string, string>;
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function getSettings(prisma: PrismaClient): Promise<AppSettings> {
  const rows = await prisma.setting.findMany();
  const raw: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const row of rows) raw[row.key] = row.value;
  return {
    autoSendEnabled: raw.autoSendEnabled === 'true',
    maxStandardAreaM2: num(raw.maxStandardAreaM2, 500),
    maxStandardPallets: num(raw.maxStandardPallets, 10),
    wasteFactor: num(raw.wasteFactor, 1.05),
    companyName: raw.companyName ?? DEFAULT_SETTINGS.companyName,
    companyEmail: raw.companyEmail ?? DEFAULT_SETTINGS.companyEmail,
    companyPhone: raw.companyPhone ?? DEFAULT_SETTINGS.companyPhone,
    raw,
  };
}

/** Prüft einen einzelnen Wert; gibt eine Fehlermeldung zurück oder null. */
export function validateSetting(key: string, value: string): string | null {
  switch (key) {
    case 'autoSendEnabled':
      return value === 'true' || value === 'false' ? null : 'muss "true" oder "false" sein';
    case 'maxStandardAreaM2':
    case 'maxStandardPallets': {
      const n = Number(value);
      return Number.isFinite(n) && n > 0 ? null : 'muss eine positive Zahl sein';
    }
    case 'wasteFactor': {
      const n = Number(value);
      return Number.isFinite(n) && n >= 1 && n <= 2 ? null : 'muss zwischen 1 und 2 liegen';
    }
    case 'companyName':
    case 'companyEmail':
    case 'companyPhone':
      return value.trim().length > 0 ? null : 'darf nicht leer sein';
    default:
      return 'unbekannter Schlüssel';
  }
}
