import { fileURLToPath } from 'node:url';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';

export interface SeedOptions {
  adminEmail?: string | undefined;
  adminPassword?: string | undefined;
  log?: (message: string) => void;
}

const PRODUCTS = [
  {
    slug: 'classicxtreme',
    name: 'classicXtreme',
    description:
      'Bodenschutzplatte aus 100 % Recycling-Kunststoff, hergestellt in der EU, für Baustellen und Schwerlast, Paddock und Reitsport, Events und Kommunen. Befahrbarer Boden ohne Standzeiten, Bodenschutz ohne Versiegelung.',
    lengthCm: 240,
    widthCm: 120,
    thicknessMm: 15,
    weightKg: 38,
    platesPerPallet: 25,
    pricePerPlateCents: 8900,
    loadCapacityTons: 40,
    material: '100 % Recycling-Kunststoff',
    isPlaceholder: true,
    active: true,
    sortOrder: 1,
  },
  {
    slug: 'classicxtreme-schwerlast',
    name: 'classicXtreme Schwerlast',
    description:
      'Verstärkte Ausführung für dauerhafte Schwerlastzufahrten und Kranstellflächen. Alle Kennzahlen sind Platzhalter und werden vom Team bestätigt.',
    lengthCm: 240,
    widthCm: 120,
    thicknessMm: 20,
    weightKg: 48,
    platesPerPallet: 20,
    pricePerPlateCents: 11900,
    loadCapacityTons: 60,
    material: '100 % Recycling-Kunststoff',
    isPlaceholder: true,
    active: true,
    sortOrder: 2,
  },
];

const ZONES = [
  { name: 'Ost (Wien, NÖ, Burgenland)', postalPrefixes: '1,2,3,7', pricePerPalletCents: 9000, minimumCents: 15000 },
  { name: 'Süd (Steiermark, Kärnten)', postalPrefixes: '8,9', pricePerPalletCents: 11000, minimumCents: 18000 },
  { name: 'Mitte (OÖ, Salzburg)', postalPrefixes: '4,5', pricePerPalletCents: 10000, minimumCents: 16000 },
  { name: 'West (Tirol, Vorarlberg)', postalPrefixes: '6', pricePerPalletCents: 14000, minimumCents: 22000 },
];

const RULES = [
  {
    key: 'inquiry_confirmation',
    label: 'Eingangsbestätigung an Kunden',
    description: 'Nach einer neuen Anfrage automatisch eine Eingangsbestätigung an den Kunden senden.',
  },
  {
    key: 'standard_offer_send',
    label: 'Standard-Angebotsentwurf automatisch senden',
    description: 'Angebotsentwurf mit PDF für Standardfälle ohne manuelle Freigabe versenden. Prüffälle gehen immer an den Menschen.',
  },
  {
    key: 'standard_email_reply',
    label: 'Standard-E-Mails automatisch beantworten',
    description: 'Eingehende E-Mails der Kategorie STANDARD mit dem KI-Entwurf automatisch beantworten.',
  },
];

const SETTINGS: Record<string, string> = {
  autoSendEnabled: 'false',
  maxStandardAreaM2: '500',
  maxStandardPallets: '10',
  wasteFactor: '1.05',
  companyName: 'Bodenschutz Austria',
  companyEmail: 'info@bodenschutz-austria.at',
  companyPhone: '+43 660 7602201',
};

/** Idempotenter Seed: legt fehlende Datensätze an, überschreibt keine vom Admin geänderten Werte. */
export async function seedDatabase(prisma: PrismaClient, options: SeedOptions = {}): Promise<void> {
  const log = options.log ?? (() => undefined);

  for (const p of PRODUCTS) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) continue;
    await prisma.product.create({ data: p });
    log(`Produkt angelegt: ${p.name} (Platzhalter)`);
  }

  for (const z of ZONES) {
    const existing = await prisma.freightZone.findFirst({ where: { name: z.name } });
    if (existing) continue;
    await prisma.freightZone.create({ data: { ...z, isPlaceholder: true } });
    log(`Frachtzone angelegt: ${z.name} (Platzhalter)`);
  }

  for (const r of RULES) {
    await prisma.approvalRule.upsert({
      where: { key: r.key },
      update: { label: r.label, description: r.description },
      create: { ...r, autoAllowed: false },
    });
  }
  log('Freigaberegeln vorhanden (alle auf manuell)');

  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  log('Einstellungen vorhanden');

  const email = options.adminEmail?.trim().toLowerCase();
  const password = options.adminPassword;
  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (!existing) {
      await prisma.adminUser.create({ data: { email, passwordHash } });
      log(`Admin angelegt: ${email}`);
    } else {
      await prisma.adminUser.update({ where: { email }, data: { passwordHash } });
      log(`Admin-Passwort aktualisiert: ${email}`);
    }
  } else {
    log('Hinweis: ADMIN_EMAIL/ADMIN_PASSWORD nicht gesetzt, kein Admin angelegt');
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const { env } = await import('../src/env.js');
  const { getPrisma, disconnectPrisma } = await import('../src/db.js');
  const prisma = getPrisma();
  try {
    await seedDatabase(prisma, { adminEmail: env.ADMIN_EMAIL, adminPassword: env.ADMIN_PASSWORD, log: (m) => console.log(`[seed] ${m}`) });
  } finally {
    await disconnectPrisma();
  }
}
