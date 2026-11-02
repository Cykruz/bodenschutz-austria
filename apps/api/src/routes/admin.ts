import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { classifyEmail, draftEmailReply } from '../ai.js';
import { env, paths } from '../env.js';
import { HttpError, badRequest, notFound, parseWith } from '../errors.js';
import {
  approveAndSend,
  ensureOfferPdf,
  presentInquiry,
  regenerateDraft,
  rejectInquiry,
  sendQuestion,
  splitPrefixes,
  toPublicProduct,
} from '../inquiry-service.js';
import { sendMail } from '../mail.js';
import { pdfFilePath } from '../pdf.js';
import { SETTING_KEYS, getSettings, validateSetting } from '../settings.js';
import { mimeForFileName } from '../upload.js';

export const ADMIN_COOKIE = 'bsa_admin';
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const MAX_LOGIN_FAILURES = 5;
const LOCK_MINUTES = 15;

interface FailureEntry {
  count: number;
  lockedUntil: number;
}
const loginFailures = new Map<string, FailureEntry>();

/** Nur für Tests. */
export function resetLoginFailures(): void {
  loginFailures.clear();
}

function failureKey(req: FastifyRequest, email: string): string {
  return `${req.ip}|${email.toLowerCase()}`;
}

function checkLocked(key: string): number | null {
  const entry = loginFailures.get(key);
  if (!entry) return null;
  if (entry.lockedUntil > Date.now()) return Math.ceil((entry.lockedUntil - Date.now()) / 1000);
  if (entry.lockedUntil !== 0) loginFailures.delete(key);
  return null;
}

function recordFailure(key: string): void {
  const entry = loginFailures.get(key) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_LOGIN_FAILURES) {
    entry.lockedUntil = Date.now() + LOCK_MINUTES * 60 * 1000;
    entry.count = 0;
  }
  loginFailures.set(key, entry);
}

const loginSchema = z.object({ email: z.string().trim().email().max(200), password: z.string().min(1).max(200) });

const productSchema = z.object({
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/, 'nur Kleinbuchstaben, Ziffern und Bindestriche'),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(''),
  lengthCm: z.number().positive(),
  widthCm: z.number().positive(),
  thicknessMm: z.number().positive(),
  weightKg: z.number().positive(),
  platesPerPallet: z.number().int().positive(),
  pricePerPlateCents: z.number().int().min(0).default(0),
  loadCapacityTons: z.number().positive(),
  material: z.string().trim().max(200).default(''),
  isPlaceholder: z.boolean().default(true),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const prefixesSchema = z.union([z.array(z.string().trim().regex(/^\d{1,4}$/)).min(1), z.string().trim().min(1)]);
const zoneSchema = z.object({
  name: z.string().trim().min(1).max(80),
  postalPrefixes: prefixesSchema,
  pricePerPalletCents: z.number().int().min(0),
  minimumCents: z.number().int().min(0),
  isPlaceholder: z.boolean().default(true),
});

function normalizePrefixes(value: string[] | string): string {
  const list = Array.isArray(value) ? value : splitPrefixes(value);
  const clean = list.map((s) => s.trim()).filter((s) => /^\d{1,4}$/.test(s));
  if (clean.length === 0) throw badRequest('postalPrefixes: mindestens ein PLZ-Präfix (Ziffern) nötig');
  return clean.join(',');
}

function presentZone<T extends { postalPrefixes: string }>(zone: T) {
  return { ...zone, postalPrefixes: splitPrefixes(zone.postalPrefixes) };
}

const patchInquirySchema = z.object({
  status: z.enum(['NEW', 'DRAFT', 'QUESTION', 'APPROVED', 'SENT', 'REJECTED']).optional(),
  adminNotes: z.string().max(4000).nullable().optional(),
  aiDraft: z.string().max(20000).nullable().optional(),
});

export interface AdminRouteOptions {
  rateLimits: boolean;
}

export async function adminRoutes(app: FastifyInstance, opts: AdminRouteOptions): Promise<void> {
  const limit = (max: number, timeWindow: string) => (opts.rateLimits ? { config: { rateLimit: { max, timeWindow } } } : {});
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };

  // ---- Auth -----------------------------------------------------------------

  app.post('/login', limit(10, '15 minutes'), async (req, reply) => {
    const body = parseWith(loginSchema, req.body, 'Login');
    const key = failureKey(req, body.email);
    const lockedFor = checkLocked(key);
    if (lockedFor !== null) {
      throw new HttpError(429, `Zu viele Fehlversuche. Bitte in ${Math.ceil(lockedFor / 60)} Minuten erneut versuchen.`);
    }
    const user = await app.prisma.adminUser.findUnique({ where: { email: body.email.toLowerCase() } });
    const ok = user ? await bcrypt.compare(body.password, user.passwordHash) : await bcrypt.compare(body.password, DUMMY_HASH).then(() => false);
    if (!user || !ok) {
      recordFailure(key);
      throw new HttpError(401, 'E-Mail oder Passwort falsch');
    }
    loginFailures.delete(key);
    const token = await reply.jwtSign({ sub: user.id, email: user.email }, { expiresIn: '7d' });
    reply.setCookie(ADMIN_COOKIE, token, cookieOptions);
    return { ok: true, user: { id: user.id, email: user.email } };
  });

  app.post('/logout', async (_req, reply) => {
    reply.clearCookie(ADMIN_COOKIE, { path: '/' });
    return { ok: true };
  });

  // Alles ab hier nur mit gültiger Sitzung
  app.register(async (secured) => {
    secured.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        await req.jwtVerify();
      } catch {
        reply.clearCookie(ADMIN_COOKIE, { path: '/' });
        throw new HttpError(401, 'Nicht angemeldet');
      }
    });

    secured.get('/me', async (req) => {
      const user = await app.prisma.adminUser.findUnique({ where: { id: req.user.sub }, select: { id: true, email: true, createdAt: true } });
      if (!user) throw new HttpError(401, 'Nicht angemeldet');
      return user;
    });

    // ---- Anfragen -----------------------------------------------------------

    secured.get<{ Querystring: { status?: string; q?: string } }>('/inquiries', async (req) => {
      const status = req.query.status?.trim();
      const q = req.query.q?.trim();
      const inquiries = await app.prisma.inquiry.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(q
            ? {
                OR: [
                  { customerName: { contains: q } },
                  { email: { contains: q } },
                  { city: { contains: q } },
                  { postalCode: { contains: q } },
                  { id: { contains: q } },
                ],
              }
            : {}),
        },
        include: { product: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      return inquiries.map(presentInquiry);
    });

    secured.get<{ Params: { id: string } }>('/inquiries/:id', async (req) => {
      const inquiry = await app.prisma.inquiry.findUnique({
        where: { id: req.params.id },
        include: { product: true, emails: { orderBy: { receivedAt: 'asc' } } },
      });
      if (!inquiry) throw notFound('Anfrage nicht gefunden');
      return presentInquiry(inquiry);
    });

    secured.patch<{ Params: { id: string } }>('/inquiries/:id', async (req) => {
      const body = parseWith(patchInquirySchema, req.body, 'Änderung');
      const existing = await app.prisma.inquiry.findUnique({ where: { id: req.params.id } });
      if (!existing) throw notFound('Anfrage nicht gefunden');
      const updated = await app.prisma.inquiry.update({
        where: { id: req.params.id },
        data: {
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.adminNotes !== undefined ? { adminNotes: body.adminNotes } : {}),
          ...(body.aiDraft !== undefined ? { aiDraft: body.aiDraft } : {}),
        },
        include: { product: true },
      });
      return presentInquiry(updated);
    });

    secured.post<{ Params: { id: string } }>('/inquiries/:id/approve-send', async (req) => {
      const body = (req.body ?? {}) as { text?: unknown };
      const text = typeof body.text === 'string' && body.text.trim() ? body.text : undefined;
      const updated = await approveAndSend(app.prisma, req.log, req.params.id, text ? { text } : {});
      return presentInquiry(updated);
    });

    secured.post<{ Params: { id: string } }>('/inquiries/:id/question', async (req) => {
      const body = parseWith(z.object({ text: z.string().trim().min(1).max(20000) }), req.body, 'Rückfrage');
      const updated = await sendQuestion(app.prisma, req.params.id, body.text);
      return presentInquiry(updated);
    });

    secured.post<{ Params: { id: string } }>('/inquiries/:id/reject', async (req) => {
      const body = parseWith(z.object({ reason: z.string().trim().max(2000).optional() }), req.body ?? {}, 'Ablehnung');
      const updated = await rejectInquiry(app.prisma, req.params.id, body.reason);
      return presentInquiry(updated);
    });

    secured.post<{ Params: { id: string } }>('/inquiries/:id/regenerate-draft', async (req) => {
      const updated = await regenerateDraft(app.prisma, req.params.id);
      return presentInquiry(updated);
    });

    secured.get<{ Params: { id: string } }>('/inquiries/:id/photo', async (req, reply) => {
      const inquiry = await app.prisma.inquiry.findUnique({ where: { id: req.params.id }, select: { photoPath: true } });
      if (!inquiry?.photoPath) throw notFound('Kein Foto vorhanden');
      const file = path.join(paths.uploadsDir, path.basename(inquiry.photoPath));
      if (!fs.existsSync(file)) throw notFound('Fotodatei nicht mehr vorhanden');
      reply.header('Cache-Control', 'private, max-age=60');
      return reply.type(mimeForFileName(file)).send(fs.createReadStream(file));
    });

    secured.get<{ Params: { id: string } }>('/inquiries/:id/pdf', async (req, reply) => {
      const inquiry = await app.prisma.inquiry.findUnique({ where: { id: req.params.id } });
      if (!inquiry) throw notFound('Anfrage nicht gefunden');
      let fileName = await ensureOfferPdf(app.prisma, inquiry, false);
      if (!fs.existsSync(pdfFilePath(fileName))) fileName = await ensureOfferPdf(app.prisma, inquiry, true);
      reply.header('Content-Disposition', `inline; filename="Angebotsentwurf-${inquiry.id}.pdf"`);
      return reply.type('application/pdf').send(fs.createReadStream(pdfFilePath(fileName)));
    });

    // ---- Produkte -----------------------------------------------------------

    secured.get('/products', async () => {
      const products = await app.prisma.product.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
      return products.map((p) => ({ ...toPublicProduct(p), active: p.active, sortOrder: p.sortOrder }));
    });

    secured.post('/products', async (req, reply) => {
      const body = parseWith(productSchema, req.body, 'Produkt');
      const existing = await app.prisma.product.findUnique({ where: { slug: body.slug } });
      if (existing) throw new HttpError(409, 'Slug bereits vergeben');
      const created = await app.prisma.product.create({ data: body });
      reply.code(201);
      return { ...toPublicProduct(created), active: created.active, sortOrder: created.sortOrder };
    });

    secured.put<{ Params: { id: string } }>('/products/:id', async (req) => {
      const body = parseWith(productSchema.partial(), req.body, 'Produkt');
      const existing = await app.prisma.product.findUnique({ where: { id: req.params.id } });
      if (!existing) throw notFound('Produkt nicht gefunden');
      if (body.slug && body.slug !== existing.slug) {
        const clash = await app.prisma.product.findUnique({ where: { slug: body.slug } });
        if (clash) throw new HttpError(409, 'Slug bereits vergeben');
      }
      const updated = await app.prisma.product.update({ where: { id: req.params.id }, data: body });
      return { ...toPublicProduct(updated), active: updated.active, sortOrder: updated.sortOrder };
    });

    secured.delete<{ Params: { id: string } }>('/products/:id', async (req) => {
      const existing = await app.prisma.product.findUnique({ where: { id: req.params.id } });
      if (!existing) throw notFound('Produkt nicht gefunden');
      const used = await app.prisma.inquiry.count({ where: { productId: req.params.id } });
      if (used > 0) {
        // Anfragen verweisen darauf: nur deaktivieren, nicht löschen
        await app.prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
        return { ok: true, deactivated: true, message: 'Produkt wird von Anfragen verwendet und wurde deaktiviert statt gelöscht' };
      }
      await app.prisma.product.delete({ where: { id: req.params.id } });
      return { ok: true, deactivated: false };
    });

    // ---- Frachtzonen --------------------------------------------------------

    secured.get('/freight-zones', async () => {
      const zones = await app.prisma.freightZone.findMany({ orderBy: { name: 'asc' } });
      return zones.map(presentZone);
    });

    secured.post('/freight-zones', async (req, reply) => {
      const body = parseWith(zoneSchema, req.body, 'Frachtzone');
      const created = await app.prisma.freightZone.create({ data: { ...body, postalPrefixes: normalizePrefixes(body.postalPrefixes) } });
      reply.code(201);
      return presentZone(created);
    });

    secured.put<{ Params: { id: string } }>('/freight-zones/:id', async (req) => {
      const body = parseWith(zoneSchema.partial(), req.body, 'Frachtzone');
      const existing = await app.prisma.freightZone.findUnique({ where: { id: req.params.id } });
      if (!existing) throw notFound('Frachtzone nicht gefunden');
      const { postalPrefixes, ...rest } = body;
      const updated = await app.prisma.freightZone.update({
        where: { id: req.params.id },
        data: { ...rest, ...(postalPrefixes !== undefined ? { postalPrefixes: normalizePrefixes(postalPrefixes) } : {}) },
      });
      return presentZone(updated);
    });

    secured.delete<{ Params: { id: string } }>('/freight-zones/:id', async (req) => {
      const existing = await app.prisma.freightZone.findUnique({ where: { id: req.params.id } });
      if (!existing) throw notFound('Frachtzone nicht gefunden');
      await app.prisma.freightZone.delete({ where: { id: req.params.id } });
      return { ok: true };
    });

    // ---- Regeln und Einstellungen ------------------------------------------

    secured.get('/rules', async () => app.prisma.approvalRule.findMany({ orderBy: { key: 'asc' } }));

    secured.put<{ Params: { key: string } }>('/rules/:key', async (req) => {
      const body = parseWith(z.object({ autoAllowed: z.boolean() }), req.body, 'Regel');
      const existing = await app.prisma.approvalRule.findUnique({ where: { key: req.params.key } });
      if (!existing) throw notFound('Regel nicht gefunden');
      return app.prisma.approvalRule.update({ where: { key: req.params.key }, data: { autoAllowed: body.autoAllowed } });
    });

    secured.get('/settings', async () => {
      const settings = await getSettings(app.prisma);
      return settings.raw;
    });

    secured.put('/settings', async (req) => {
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Body muss ein Objekt { key: value } sein');
      const entries = Object.entries(body as Record<string, unknown>);
      if (entries.length === 0) throw badRequest('Keine Einstellungen übergeben');
      const errors: { path: string; message: string }[] = [];
      const updates: { key: string; value: string }[] = [];
      for (const [key, raw] of entries) {
        if (!(SETTING_KEYS as readonly string[]).includes(key)) {
          errors.push({ path: key, message: 'unbekannter Schlüssel' });
          continue;
        }
        const value = typeof raw === 'boolean' || typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : '';
        const problem = validateSetting(key, value);
        if (problem) errors.push({ path: key, message: problem });
        else updates.push({ key, value });
      }
      if (errors.length > 0) throw badRequest('Einstellungen ungültig', errors);
      await app.prisma.$transaction(
        updates.map((u) => app.prisma.setting.upsert({ where: { key: u.key }, update: { value: u.value }, create: u })),
      );
      const settings = await getSettings(app.prisma);
      return settings.raw;
    });

    // ---- E-Mails ------------------------------------------------------------

    secured.get<{ Querystring: { status?: string; direction?: string } }>('/emails', async (req) => {
      const status = req.query.status?.trim();
      const direction = req.query.direction?.trim();
      return app.prisma.emailMessage.findMany({
        where: { ...(status ? { status } : {}), ...(direction ? { direction } : {}) },
        orderBy: { receivedAt: 'desc' },
        take: 200,
      });
    });

    secured.get<{ Params: { id: string } }>('/emails/:id', async (req) => {
      const mail = await app.prisma.emailMessage.findUnique({ where: { id: req.params.id } });
      if (!mail) throw notFound('E-Mail nicht gefunden');
      const replies = await app.prisma.emailMessage.findMany({ where: { inReplyToId: mail.id }, orderBy: { receivedAt: 'asc' } });
      return { ...mail, replies };
    });

    secured.post<{ Params: { id: string } }>('/emails/:id/send', async (req) => {
      const body = parseWith(z.object({ text: z.string().trim().min(1).max(20000).optional() }), req.body ?? {}, 'Antwort');
      const mail = await app.prisma.emailMessage.findUnique({ where: { id: req.params.id } });
      if (!mail) throw notFound('E-Mail nicht gefunden');
      if (mail.direction !== 'IN') throw badRequest('Nur eingehende E-Mails können beantwortet werden');
      if (mail.status === 'SENT') throw new HttpError(409, 'E-Mail wurde bereits beantwortet');
      const text = body.text ?? mail.aiDraft ?? '';
      if (!text.trim()) throw badRequest('Kein Entwurf vorhanden; bitte Text angeben');
      const subject = /^(re|aw):/i.test(mail.subject) ? mail.subject : `AW: ${mail.subject}`;
      const sent = await sendMail(app.prisma, {
        to: mail.fromAddress,
        subject,
        text,
        inquiryId: mail.inquiryId,
        inReplyToId: mail.id,
        inReplyToMessageId: mail.messageId,
      });
      const updated = await app.prisma.emailMessage.update({ where: { id: mail.id }, data: { status: 'SENT', aiDraft: text } });
      return { ...updated, sentMessage: sent };
    });

    secured.post<{ Params: { id: string } }>('/emails/:id/ignore', async (req) => {
      const mail = await app.prisma.emailMessage.findUnique({ where: { id: req.params.id } });
      if (!mail) throw notFound('E-Mail nicht gefunden');
      return app.prisma.emailMessage.update({ where: { id: mail.id }, data: { status: 'IGNORED' } });
    });

    secured.post<{ Params: { id: string } }>('/emails/:id/regenerate-draft', async (req) => {
      const mail = await app.prisma.emailMessage.findUnique({ where: { id: req.params.id } });
      if (!mail) throw notFound('E-Mail nicht gefunden');
      if (mail.direction !== 'IN') throw badRequest('Nur für eingehende E-Mails');
      const incoming = { fromAddress: mail.fromAddress, subject: mail.subject, textBody: mail.textBody };
      const [classification, products, settings] = await Promise.all([
        classifyEmail(incoming),
        app.prisma.product.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
        getSettings(app.prisma),
      ]);
      const draft = classification.category === 'UNRELATED' ? null : await draftEmailReply(incoming, classification.category, products, settings);
      return app.prisma.emailMessage.update({
        where: { id: mail.id },
        data: {
          category: classification.category,
          aiDraft: draft,
          ...(mail.status === 'NEW' && draft ? { status: 'DRAFT' } : {}),
        },
      });
    });

    // ---- Dashboard ----------------------------------------------------------

    secured.get('/stats', async () => {
      const [inquiryGroups, emailGroups, settings, rules] = await Promise.all([
        app.prisma.inquiry.groupBy({ by: ['status'], _count: { _all: true } }),
        app.prisma.emailMessage.groupBy({ by: ['status'], _count: { _all: true } }),
        getSettings(app.prisma),
        app.prisma.approvalRule.findMany(),
      ]);
      const inquiries: Record<string, number> = { NEW: 0, DRAFT: 0, QUESTION: 0, APPROVED: 0, SENT: 0, REJECTED: 0 };
      for (const g of inquiryGroups) inquiries[g.status] = g._count._all;
      const emails: Record<string, number> = { NEW: 0, DRAFT: 0, SENT: 0, IGNORED: 0 };
      for (const g of emailGroups) emails[g.status] = g._count._all;
      const reviewOpen = await app.prisma.inquiry.count({ where: { classification: 'REVIEW', status: { in: ['NEW', 'DRAFT', 'QUESTION'] } } });
      const placeholderProducts = await app.prisma.product.count({ where: { isPlaceholder: true } });
      const placeholderZones = await app.prisma.freightZone.count({ where: { isPlaceholder: true } });
      return {
        inquiries,
        inquiriesTotal: Object.values(inquiries).reduce((a, b) => a + b, 0),
        reviewOpen,
        emails,
        emailsTotal: Object.values(emails).reduce((a, b) => a + b, 0),
        autoSendEnabled: settings.autoSendEnabled,
        rules: Object.fromEntries(rules.map((r) => [r.key, r.autoAllowed])),
        placeholders: { products: placeholderProducts, freightZones: placeholderZones },
      };
    });
  });
}

// bcrypt-Hash eines zufälligen Werts: sorgt für konstante Antwortzeit bei unbekannter E-Mail
const DUMMY_HASH = bcrypt.hashSync('nicht-verwendet', 10);
