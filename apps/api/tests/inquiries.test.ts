import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp, firstProductId, standardInquiry } from './helpers.js';

const sendMailMock = vi.hoisted(() => vi.fn(async () => ({ messageId: '<mock@test.local>' })));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail: sendMailMock }) } }));

let app: FastifyInstance;
let productId: string;

beforeAll(async () => {
  app = await createTestApp();
  productId = await firstProductId(app);
});
afterAll(async () => {
  await app.close();
});

describe('POST /api/inquiries', () => {
  it('legt einen Standardfall an, erzeugt einen Entwurf und sendet nichts automatisch', async () => {
    sendMailMock.mockClear();
    const res = await app.inject({ method: 'POST', url: '/api/inquiries', payload: standardInquiry(productId) });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.classification).toBe('STANDARD');
    expect(body.reviewReasons).toEqual([]);
    expect(body.status).toBe('DRAFT');
    expect(body.calculation.plates).toBe(37);
    expect(body.message).toContain('noch keine Bestellung');
    expect(body.message).toContain('KI-System');

    const stored = await app.prisma.inquiry.findUniqueOrThrow({ where: { id: body.id } });
    expect(stored.channel).toBe('WEB');
    expect(stored.aiDraft).toContain('Guten Tag Test Kundin');
    expect(stored.aiDraft).toContain('37 Stück');
    // Platzhalterdaten: keine Preise im Entwurf, sondern „Preis folgt nach Prüfung“
    expect(stored.aiDraft).toContain('Preis folgt nach Prüfung');
    expect(stored.aiDraft).toContain('Diese Antwort wurde mit KI-Unterstützung erstellt');
    expect(JSON.parse(stored.calculation).pallets).toBe(2);
    expect(sendMailMock).not.toHaveBeenCalled();
    expect(await app.prisma.emailMessage.count({ where: { inquiryId: body.id } })).toBe(0);
  });

  it('stuft Miete, Kran und Signalwörter als REVIEW ein und erzeugt eine Rückfrage', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/inquiries',
      payload: standardInquiry(productId, { unloading: 'CRANE_NEEDED', rentalRequested: true, notes: 'Bitte dringend, geht auch Rabatt?', channel: 'APP' }),
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.classification).toBe('REVIEW');
    expect(body.reviewReasons.join(' | ')).toContain('Miete');
    expect(body.reviewReasons.join(' | ')).toContain('Kran');
    expect(body.reviewReasons.join(' | ')).toContain('Sonderwunsch');
    const stored = await app.prisma.inquiry.findUniqueOrThrow({ where: { id: body.id } });
    expect(stored.classification).toBe('REVIEW');
    expect(stored.aiDraft).toContain('Fragen');
    expect(stored.aiDraft).not.toContain('EUR');
  });

  it('REVIEW bei Fläche über Grenzwert und fehlender Frachtzone', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/inquiries',
      payload: standardInquiry(productId, { areaM2: 900, postalCode: '0123', city: 'Nirgendwo' }),
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.classification).toBe('REVIEW');
    expect(body.reviewReasons.join(' | ')).toContain('Grenzwert');
    expect(body.reviewReasons.join(' | ')).toContain('Frachtzone');
  });

  it('validiert Pflichtfelder', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/inquiries', payload: standardInquiry(productId, { email: 'keine-mail', customerName: '' }) });
    expect(res.statusCode).toBe(400);
    const details = res.json().details as { path: string }[];
    expect(details.map((d) => d.path)).toEqual(expect.arrayContaining(['email', 'customerName']));
  });

  it('lehnt unbekannte photoId ab', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/inquiries', payload: standardInquiry(productId, { photoId: '00000000-0000-0000-0000-000000000000' }) });
    expect(res.statusCode).toBe(400);
  });

  it('sendet die Eingangsbestätigung nur mit autoSendEnabled UND Regel', async () => {
    sendMailMock.mockClear();
    await app.prisma.approvalRule.update({ where: { key: 'inquiry_confirmation' }, data: { autoAllowed: true } });
    // Regel allein reicht nicht
    const first = await app.inject({ method: 'POST', url: '/api/inquiries', payload: standardInquiry(productId) });
    expect(first.statusCode).toBe(201);
    expect(sendMailMock).not.toHaveBeenCalled();

    await app.prisma.setting.update({ where: { key: 'autoSendEnabled' }, data: { value: 'true' } });
    try {
      const second = await app.inject({ method: 'POST', url: '/api/inquiries', payload: standardInquiry(productId) });
      expect(second.statusCode).toBe(201);
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const logged = await app.prisma.emailMessage.findMany({ where: { inquiryId: second.json().id } });
      expect(logged).toHaveLength(1);
      expect(logged[0]?.direction).toBe('OUT');
      expect(logged[0]?.autoSent).toBe(true);
      expect(logged[0]?.textBody).toContain('KI-Unterstützung');
      // Angebot selbst wurde nicht automatisch gesendet (Regel standard_offer_send aus)
      expect(second.json().status).toBe('DRAFT');
    } finally {
      await app.prisma.setting.update({ where: { key: 'autoSendEnabled' }, data: { value: 'false' } });
      await app.prisma.approvalRule.update({ where: { key: 'inquiry_confirmation' }, data: { autoAllowed: false } });
    }
  });
});
