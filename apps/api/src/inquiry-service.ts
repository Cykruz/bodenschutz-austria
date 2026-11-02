import {
  calculate,
  classify,
  findFreightZone,
  type CalculationInput,
  type CalculationResult,
  type FreightZoneSpec,
  type ProductSpec,
} from '@bodenschutz/rules';
import type { FreightZone, Inquiry, PrismaClient, Product } from '@prisma/client';
import { z } from 'zod';
import { AI_FOOTER, DISCLOSURE, draftOffer, draftQuestion, type DraftContext } from './ai.js';
import { badRequest, notFound, HttpError } from './errors.js';
import { parseCalculation, parseReasons } from './format.js';
import { sendMail } from './mail.js';
import { generateOfferPdf, pdfFilePath } from './pdf.js';
import { evaluateAutoSend } from './policy.js';
import { getSettings, type AppSettings } from './settings.js';
import { findStoredPhoto, readPhotoSidecar } from './upload.js';

type Log = { info: (obj: unknown, msg?: string) => void; warn: (obj: unknown, msg?: string) => void; error: (obj: unknown, msg?: string) => void };

// ---------------------------------------------------------------------------
// Mapping Datenbank → Regel-Engine
// ---------------------------------------------------------------------------

export function toProductSpec(p: Product): ProductSpec {
  return {
    id: p.id,
    name: p.name,
    lengthCm: p.lengthCm,
    widthCm: p.widthCm,
    thicknessMm: p.thicknessMm,
    weightKg: p.weightKg,
    platesPerPallet: p.platesPerPallet,
    pricePerPlateCents: p.pricePerPlateCents,
    loadCapacityTons: p.loadCapacityTons,
    isPlaceholder: p.isPlaceholder,
  };
}

export function splitPrefixes(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function toZoneSpec(z: FreightZone): FreightZoneSpec {
  return {
    id: z.id,
    name: z.name,
    postalPrefixes: splitPrefixes(z.postalPrefixes),
    pricePerPalletCents: z.pricePerPalletCents,
    minimumCents: z.minimumCents,
    isPlaceholder: z.isPlaceholder,
  };
}

/** Öffentliche Produktdarstellung: ProductSpec + description, material, slug. */
export function toPublicProduct(p: Product) {
  return { ...toProductSpec(p), slug: p.slug, description: p.description, material: p.material };
}

// ---------------------------------------------------------------------------
// Validierung
// ---------------------------------------------------------------------------

const positive = z.number().finite().positive();

export const calculationBodySchema = z.object({
  projectType: z.enum(['CONSTRUCTION', 'EVENT', 'PADDOCK']),
  mode: z.enum(['AREA', 'LANES']),
  areaM2: positive.max(1_000_000).optional(),
  lengthM: positive.max(100_000).optional(),
  laneWidthM: positive.max(100).optional(),
  laneCount: z.number().int().min(1).max(20).optional(),
  wasteFactor: z.number().min(1).max(2).optional(),
  postalCode: z.string().trim().max(10).optional(),
  productId: z.string().min(1),
});
export type CalculationBody = z.infer<typeof calculationBodySchema>;

export const inquiryBodySchema = calculationBodySchema.omit({ wasteFactor: true, postalCode: true }).extend({
  photoId: z.string().trim().max(64).optional(),
  customerName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(50).optional(),
  street: z.string().trim().max(200).optional(),
  postalCode: z.string().trim().min(3).max(10),
  city: z.string().trim().min(1).max(100),
  unloading: z.enum(['FORKLIFT', 'CRANE_NEEDED', 'UNKNOWN']),
  notes: z.string().trim().max(4000).optional(),
  rentalRequested: z.boolean().optional(),
  channel: z.enum(['APP', 'WEB']),
  aiDisclosureShown: z.boolean().optional(),
});
export type InquiryBody = z.infer<typeof inquiryBodySchema>;

// ---------------------------------------------------------------------------
// Berechnung
// ---------------------------------------------------------------------------

export interface RuleContext {
  settings: AppSettings;
  zones: FreightZone[];
}

export async function loadRuleContext(prisma: PrismaClient): Promise<RuleContext> {
  const [settings, zones] = await Promise.all([getSettings(prisma), prisma.freightZone.findMany()]);
  return { settings, zones };
}

export async function requireActiveProduct(prisma: PrismaClient, productId: string): Promise<Product> {
  const product = await prisma.product.findFirst({ where: { id: productId, active: true } });
  if (!product) throw badRequest('Produkt nicht gefunden oder nicht aktiv', [{ path: 'productId', message: 'unbekannt' }]);
  return product;
}

function toRangeError(err: unknown): never {
  if (err instanceof RangeError) throw badRequest(err.message);
  throw err;
}

export function runCalculation(body: CalculationBody, product: Product, ctx: RuleContext): CalculationResult {
  const input: CalculationInput = {
    projectType: body.projectType,
    mode: body.mode,
    wasteFactor: body.wasteFactor ?? ctx.settings.wasteFactor,
  };
  if (body.areaM2 !== undefined) input.areaM2 = body.areaM2;
  if (body.lengthM !== undefined) input.lengthM = body.lengthM;
  if (body.laneWidthM !== undefined) input.laneWidthM = body.laneWidthM;
  if (body.laneCount !== undefined) input.laneCount = body.laneCount;
  if (body.postalCode) input.postalCode = body.postalCode;
  try {
    return calculate(input, toProductSpec(product), ctx.zones.map(toZoneSpec));
  } catch (err) {
    return toRangeError(err);
  }
}

// ---------------------------------------------------------------------------
// Anfrage anlegen
// ---------------------------------------------------------------------------

export interface CreateInquiryResult {
  id: string;
  status: string;
  classification: 'STANDARD' | 'REVIEW';
  reviewReasons: string[];
  calculation: CalculationResult;
  message: string;
}

export async function createInquiry(prisma: PrismaClient, log: Log, body: InquiryBody): Promise<CreateInquiryResult> {
  const product = await requireActiveProduct(prisma, body.productId);
  const ctx = await loadRuleContext(prisma);
  const calculation = runCalculation({ ...body, postalCode: body.postalCode }, product, ctx);

  let photoPath: string | null = null;
  let photoAnalysis: string | null = null;
  if (body.photoId) {
    const stored = await findStoredPhoto(body.photoId);
    if (!stored) throw badRequest('photoId unbekannt oder abgelaufen', [{ path: 'photoId', message: 'unbekannt' }]);
    photoPath = stored.fileName;
    const sidecar = await readPhotoSidecar(body.photoId);
    if (sidecar) photoAnalysis = JSON.stringify(sidecar);
  }

  const zone = findFreightZone(body.postalCode, ctx.zones.map(toZoneSpec));
  const classification = classify(
    {
      calculation,
      unloading: body.unloading,
      notes: body.notes ?? '',
      rentalRequested: body.rentalRequested ?? false,
      hasPhoto: photoPath !== null,
      contactComplete: Boolean(body.customerName && body.email && body.postalCode && body.city),
      hasFreightZone: zone !== undefined,
    },
    { maxStandardAreaM2: ctx.settings.maxStandardAreaM2, maxStandardPallets: ctx.settings.maxStandardPallets },
  );

  const inquiry = await prisma.inquiry.create({
    data: {
      channel: body.channel,
      status: 'NEW',
      projectType: body.projectType,
      mode: body.mode,
      areaM2: body.areaM2 ?? null,
      lengthM: body.lengthM ?? null,
      laneWidthM: body.laneWidthM ?? null,
      laneCount: body.laneCount ?? null,
      productId: product.id,
      photoPath,
      photoAnalysis,
      calculation: JSON.stringify(calculation),
      classification: classification.classification,
      reviewReasons: JSON.stringify(classification.reasons),
      customerName: body.customerName,
      email: body.email,
      phone: body.phone ?? null,
      street: body.street ?? null,
      postalCode: body.postalCode,
      city: body.city,
      unloading: body.unloading,
      notes: body.notes ?? null,
      rentalRequested: body.rentalRequested ?? false,
      aiDisclosureShown: body.aiDisclosureShown ?? false,
    },
  });

  // KI-Entwurf (Angebotstext oder Rückfrage); Fehler dürfen die Anfrage nie verlieren
  let status = inquiry.status;
  try {
    const draft = await buildDraft(prisma, { ...inquiry }, product, ctx.settings);
    await prisma.inquiry.update({ where: { id: inquiry.id }, data: { aiDraft: draft, status: 'DRAFT' } });
    status = 'DRAFT';
  } catch (err) {
    log.error({ err, inquiryId: inquiry.id }, 'KI-Entwurf fehlgeschlagen');
  }

  // Eingangsbestätigung nur über die zentrale Policy
  try {
    const confirmation = await evaluateAutoSend(prisma, 'inquiry_confirmation');
    if (confirmation.allowed) {
      await sendMail(prisma, {
        to: body.email,
        subject: `Ihre Anfrage bei ${ctx.settings.companyName} ist eingegangen`,
        text: confirmationText(body.customerName, ctx.settings),
        inquiryId: inquiry.id,
        autoSent: true,
      });
      log.info({ inquiryId: inquiry.id }, 'Eingangsbestätigung automatisch gesendet');
    } else {
      log.info({ inquiryId: inquiry.id, reasons: confirmation.reasons }, 'Eingangsbestätigung nicht automatisch gesendet');
    }
  } catch (err) {
    log.error({ err, inquiryId: inquiry.id }, 'Eingangsbestätigung fehlgeschlagen');
  }

  // Standardangebot automatisch senden: nur Policy + STANDARD + Entwurf vorhanden
  if (status === 'DRAFT' && classification.classification === 'STANDARD') {
    try {
      const offer = await evaluateAutoSend(prisma, 'standard_offer_send', 'STANDARD');
      if (offer.allowed) {
        await approveAndSend(prisma, log, inquiry.id, { autoSent: true });
        status = 'SENT';
        log.info({ inquiryId: inquiry.id }, 'Standardangebot automatisch gesendet');
      }
    } catch (err) {
      log.error({ err, inquiryId: inquiry.id }, 'Automatischer Angebotsversand fehlgeschlagen');
    }
  }

  const message =
    classification.classification === 'STANDARD'
      ? `Danke, Ihre Anfrage ist eingegangen. Wir haben einen vorläufigen Vorschlag vorbereitet; ${ctx.settings.companyName} prüft ihn und meldet sich per E-Mail. ` +
        'Eine Anfrage ist noch keine Bestellung.'
      : `Danke, Ihre Anfrage ist eingegangen. Ihr Vorhaben wird persönlich geprüft; ${ctx.settings.companyName} meldet sich per E-Mail. ` +
        'Eine Anfrage ist noch keine Bestellung.';

  return {
    id: inquiry.id,
    status,
    classification: classification.classification,
    reviewReasons: classification.reasons,
    calculation,
    message: `${message} ${DISCLOSURE}`,
  };
}

function confirmationText(name: string, settings: AppSettings): string {
  return [
    `Guten Tag ${name},`,
    '',
    `vielen Dank für Ihre Anfrage bei ${settings.companyName}. Wir haben sie erhalten und prüfen Ihr Vorhaben persönlich.`,
    'Sie bekommen in Kürze eine Rückmeldung per E-Mail. Eine Anfrage ist noch keine Bestellung.',
    '',
    'Freundliche Grüße',
    settings.companyName,
    settings.companyPhone,
    settings.companyEmail,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Entwürfe
// ---------------------------------------------------------------------------

export async function buildDraft(prisma: PrismaClient, inquiry: Inquiry, product?: Product, settings?: AppSettings): Promise<string> {
  const prod = product ?? (await prisma.product.findUniqueOrThrow({ where: { id: inquiry.productId } }));
  const sett = settings ?? (await getSettings(prisma));
  const ctx: DraftContext = {
    inquiry,
    calculation: parseCalculation(inquiry),
    product: prod,
    settings: sett,
    reviewReasons: parseReasons(inquiry),
  };
  return inquiry.classification === 'STANDARD' ? draftOffer(ctx) : draftQuestion(ctx);
}

export async function regenerateDraft(prisma: PrismaClient, inquiryId: string): Promise<Inquiry> {
  const inquiry = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
  if (!inquiry) throw notFound('Anfrage nicht gefunden');
  const draft = await buildDraft(prisma, inquiry);
  return prisma.inquiry.update({
    where: { id: inquiryId },
    data: { aiDraft: draft, ...(inquiry.status === 'NEW' ? { status: 'DRAFT' } : {}) },
  });
}

// ---------------------------------------------------------------------------
// PDF, Versand, Rückfrage, Ablehnung
// ---------------------------------------------------------------------------

export async function ensureOfferPdf(prisma: PrismaClient, inquiry: Inquiry, force = false): Promise<string> {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: inquiry.productId } });
  const settings = await getSettings(prisma);
  if (inquiry.offerPdfPath && !force) {
    return inquiry.offerPdfPath;
  }
  const fileName = await generateOfferPdf({ inquiry, calculation: parseCalculation(inquiry), product, settings });
  await prisma.inquiry.update({ where: { id: inquiry.id }, data: { offerPdfPath: fileName } });
  return fileName;
}

export async function approveAndSend(
  prisma: PrismaClient,
  log: Log,
  inquiryId: string,
  opts: { autoSent?: boolean; text?: string } = {},
): Promise<Inquiry> {
  const inquiry = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
  if (!inquiry) throw notFound('Anfrage nicht gefunden');
  if (inquiry.status === 'SENT') throw new HttpError(409, 'Anfrage wurde bereits gesendet');
  if (inquiry.status === 'REJECTED') throw new HttpError(409, 'Anfrage ist abgelehnt');
  const settings = await getSettings(prisma);
  const text = (opts.text ?? inquiry.aiDraft ?? '').trim();
  if (!text) throw badRequest('Kein Entwurf vorhanden; bitte zuerst einen Entwurf erzeugen oder Text angeben');

  const pdfName = await ensureOfferPdf(prisma, inquiry, true);
  await sendMail(prisma, {
    to: inquiry.email,
    subject: `Ihr Angebotsentwurf von ${settings.companyName} (Anfrage ${inquiry.id.slice(-6).toUpperCase()})`,
    text,
    attachments: [{ filename: 'Angebotsentwurf.pdf', path: pdfFilePath(pdfName), contentType: 'application/pdf' }],
    inquiryId: inquiry.id,
    autoSent: opts.autoSent ?? false,
  });
  log.info({ inquiryId, autoSent: opts.autoSent ?? false }, 'Angebotsentwurf gesendet');
  return prisma.inquiry.update({
    where: { id: inquiryId },
    data: { status: 'SENT', sentAt: new Date(), aiDraft: text.includes(AI_FOOTER) ? text : inquiry.aiDraft },
  });
}

export async function sendQuestion(prisma: PrismaClient, inquiryId: string, text: string): Promise<Inquiry> {
  const inquiry = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
  if (!inquiry) throw notFound('Anfrage nicht gefunden');
  const settings = await getSettings(prisma);
  await sendMail(prisma, {
    to: inquiry.email,
    subject: `Rückfrage zu Ihrer Anfrage bei ${settings.companyName}`,
    text,
    inquiryId: inquiry.id,
  });
  return prisma.inquiry.update({ where: { id: inquiryId }, data: { status: 'QUESTION' } });
}

export async function rejectInquiry(prisma: PrismaClient, inquiryId: string, reason?: string): Promise<Inquiry> {
  const inquiry = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
  if (!inquiry) throw notFound('Anfrage nicht gefunden');
  const note = reason ? `${inquiry.adminNotes ? `${inquiry.adminNotes}\n` : ''}Abgelehnt: ${reason}` : inquiry.adminNotes;
  return prisma.inquiry.update({ where: { id: inquiryId }, data: { status: 'REJECTED', adminNotes: note ?? null } });
}

/** Anfrage für die Verwaltung aufbereiten (JSON-Felder geparst). */
export function presentInquiry(inquiry: Inquiry & { product?: Product | null }) {
  return {
    ...inquiry,
    calculation: parseCalculation(inquiry),
    reviewReasons: parseReasons(inquiry),
    photoAnalysis: inquiry.photoAnalysis ? (JSON.parse(inquiry.photoAnalysis) as unknown) : null,
    hasPhoto: Boolean(inquiry.photoPath),
    photoPath: undefined,
    offerPdfPath: undefined,
    hasPdf: Boolean(inquiry.offerPdfPath),
    product: inquiry.product ? toPublicProduct(inquiry.product) : undefined,
  };
}
