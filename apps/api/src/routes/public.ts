import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DISCLOSURE, MAX_CHAT_MESSAGES, analyzePhoto, chat } from '../ai.js';
import { badRequest, notFound, parseWith } from '../errors.js';
import {
  calculationBodySchema,
  createInquiry,
  inquiryBodySchema,
  loadRuleContext,
  requireActiveProduct,
  runCalculation,
  toPublicProduct,
} from '../inquiry-service.js';
import { getSettings } from '../settings.js';
import { validateAndStorePhoto, writePhotoSidecar } from '../upload.js';

const chatBodySchema = z.object({
  sessionId: z.string().trim().max(64).optional(),
  channel: z.enum(['APP', 'WEB']),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(MAX_CHAT_MESSAGES * 2),
  context: z
    .object({ projectType: z.string().max(40).optional(), calculation: z.unknown().optional() })
    .optional(),
});

export interface PublicRouteOptions {
  rateLimits: boolean;
}

export async function publicRoutes(app: FastifyInstance, opts: PublicRouteOptions): Promise<void> {
  const limit = (max: number, timeWindow: string) => (opts.rateLimits ? { config: { rateLimit: { max, timeWindow } } } : {});

  app.get('/health', async () => ({ ok: true }));

  app.get('/products', async () => {
    const products = await app.prisma.product.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    return products.map(toPublicProduct);
  });

  app.post('/calculate', limit(60, '1 minute'), async (req) => {
    const body = parseWith(calculationBodySchema, req.body, 'Berechnung');
    const product = await requireActiveProduct(app.prisma, body.productId);
    const ctx = await loadRuleContext(app.prisma);
    return runCalculation(body, product, ctx);
  });

  app.post('/photo/analyze', limit(10, '1 minute'), async (req) => {
    const file = await req.file();
    if (!file) throw badRequest('Multipart-Feld „photo“ fehlt');
    if (file.fieldname !== 'photo') throw badRequest('Datei muss im Feld „photo“ gesendet werden');
    const buffer = await file.toBuffer();
    const stored = await validateAndStorePhoto(buffer, file.mimetype);
    const analysis = await analyzePhoto(buffer, stored.mime);
    await writePhotoSidecar(stored.photoId, analysis);
    return {
      photoId: stored.photoId,
      surface: analysis.surface,
      suitability: analysis.suitability,
      notes: analysis.notes,
      confidence: analysis.confidence,
      isOrientationOnly: true as const,
      disclosure: DISCLOSURE,
    };
  });

  app.post('/inquiries', limit(5, '1 minute'), async (req, reply) => {
    const body = parseWith(inquiryBodySchema, req.body, 'Anfrage');
    const result = await createInquiry(app.prisma, req.log, body);
    reply.code(201);
    return result;
  });

  app.get<{ Params: { id: string } }>('/inquiries/:id/public', async (req) => {
    const inquiry = await app.prisma.inquiry.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, createdAt: true },
    });
    if (!inquiry) throw notFound('Anfrage nicht gefunden');
    return inquiry;
  });

  app.post('/chat', limit(20, '1 minute'), async (req) => {
    const body = parseWith(chatBodySchema, req.body, 'Chat');
    const last = body.messages[body.messages.length - 1];
    if (!last || last.role !== 'user') throw badRequest('Die letzte Nachricht muss vom Nutzer stammen');

    let session = body.sessionId ? await app.prisma.chatSession.findUnique({ where: { id: body.sessionId } }) : null;
    if (!session) session = await app.prisma.chatSession.create({ data: { channel: body.channel } });
    const priorCount = await app.prisma.chatMessage.count({ where: { sessionId: session.id, role: 'assistant' } });
    const isFirstReply = priorCount === 0 && !body.messages.some((m) => m.role === 'assistant');

    const [products, settings] = await Promise.all([
      app.prisma.product.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      getSettings(app.prisma),
    ]);
    const replyText = await chat({
      messages: body.messages.slice(-MAX_CHAT_MESSAGES),
      context: body.context,
      products,
      settings,
      isFirstReply,
    });

    await app.prisma.chatMessage.createMany({
      data: [
        { sessionId: session.id, role: 'user', content: last.content },
        { sessionId: session.id, role: 'assistant', content: replyText },
      ],
    });

    return { sessionId: session.id, reply: replyText, disclosure: DISCLOSURE };
  });
}
