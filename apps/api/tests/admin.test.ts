import fs from 'node:fs';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ADMIN, createTestApp, firstProductId, loginCookie, standardInquiry } from './helpers.js';
import { resetLoginFailures } from '../src/routes/admin.js';

type SentMail = { to: string; subject: string; text: string; attachments?: { filename: string; path?: string; contentType?: string }[] };
const sent: SentMail[] = [];
const sendMailMock = vi.hoisted(() => vi.fn());
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail: sendMailMock }) } }));

let app: FastifyInstance;
let cookie: string;
let productId: string;

beforeAll(async () => {
  sendMailMock.mockImplementation(async (mail: SentMail) => {
    sent.push(mail);
    return { messageId: `<${sent.length}@mock.local>` };
  });
  app = await createTestApp();
  productId = await firstProductId(app);
  cookie = await loginCookie(app);
});
afterAll(async () => {
  await app.close();
});

const auth = () => ({ cookie });

describe('Admin-Auth', () => {
  it('401 ohne Login', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/admin/inquiries' });
    expect(res.statusCode).toBe(401);
    const me = await app.inject({ method: 'GET', url: '/api/admin/me' });
    expect(me.statusCode).toBe(401);
  });

  it('Login setzt httpOnly-Cookie bsa_admin, /me funktioniert, Logout löscht', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/admin/login', payload: ADMIN });
    expect(res.statusCode).toBe(200);
    const setCookie = String(res.headers['set-cookie']);
    expect(setCookie).toContain('bsa_admin=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Max-Age=604800');
    const me = await app.inject({ method: 'GET', url: '/api/admin/me', headers: auth() });
    expect(me.statusCode).toBe(200);
    expect(me.json().email).toBe(ADMIN.email);
    const out = await app.inject({ method: 'POST', url: '/api/admin/logout', headers: auth() });
    expect(String(out.headers['set-cookie'])).toContain('bsa_admin=;');
  });

  it('falsches Passwort → 401, nach 5 Fehlversuchen gesperrt', async () => {
    resetLoginFailures();
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({ method: 'POST', url: '/api/admin/login', payload: { email: 'wer@test.local', password: 'falsch' } });
      expect(res.statusCode).toBe(401);
    }
    const locked = await app.inject({ method: 'POST', url: '/api/admin/login', payload: { email: 'wer@test.local', password: 'falsch' } });
    expect(locked.statusCode).toBe(429);
    resetLoginFailures();
  });
});

describe('Admin-Anfragen', () => {
  it('Liste, Detail, PATCH und Filter', async () => {
    const created = await app.inject({ method: 'POST', url: '/api/inquiries', payload: standardInquiry(productId, { customerName: 'Filter Person' }) });
    const id = created.json().id as string;

    const list = await app.inject({ method: 'GET', url: '/api/admin/inquiries', headers: auth() });
    expect(list.statusCode).toBe(200);
    const items = list.json() as { id: string; calculation: unknown; reviewReasons: unknown; product?: { name: string } }[];
    const mine = items.find((i) => i.id === id);
    expect(mine).toBeDefined();
    expect(typeof mine?.calculation).toBe('object');
    expect(Array.isArray(mine?.reviewReasons)).toBe(true);
    expect(mine?.product?.name).toBe('classicXtreme');

    const filtered = await app.inject({ method: 'GET', url: '/api/admin/inquiries?q=Filter%20Person&status=DRAFT', headers: auth() });
    expect((filtered.json() as { id: string }[]).some((i) => i.id === id)).toBe(true);
    const none = await app.inject({ method: 'GET', url: '/api/admin/inquiries?status=SENT&q=Filter%20Person', headers: auth() });
    expect((none.json() as { id: string }[]).some((i) => i.id === id)).toBe(false);

    const detail = await app.inject({ method: 'GET', url: `/api/admin/inquiries/${id}`, headers: auth() });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().customerName).toBe('Filter Person');

    const patched = await app.inject({ method: 'PATCH', url: `/api/admin/inquiries/${id}`, headers: auth(), payload: { adminNotes: 'Notiz', aiDraft: 'Eigener Text' } });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().adminNotes).toBe('Notiz');
    expect(patched.json().aiDraft).toBe('Eigener Text');
  });

  it('approve-send erzeugt PDF, sendet Mail mit Anhang, setzt SENT und protokolliert OUT', async () => {
    sent.length = 0;
    const created = await app.inject({ method: 'POST', url: '/api/inquiries', payload: standardInquiry(productId) });
    const id = created.json().id as string;

    const res = await app.inject({ method: 'POST', url: `/api/admin/inquiries/${id}/approve-send`, headers: auth() });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('SENT');
    expect(res.json().sentAt).toBeTruthy();
    expect(res.json().hasPdf).toBe(true);

    expect(sent).toHaveLength(1);
    const mail = sent[0]!;
    expect(mail.to).toBe('kundin@example.com');
    expect(mail.subject).toContain('Angebotsentwurf');
    expect(mail.text).toContain('KI-Unterstützung');
    expect(mail.attachments?.[0]?.filename).toBe('Angebotsentwurf.pdf');
    expect(mail.attachments?.[0]?.contentType).toBe('application/pdf');
    const pdfPath = mail.attachments?.[0]?.path ?? '';
    expect(fs.existsSync(pdfPath)).toBe(true);
    expect(fs.readFileSync(pdfPath).subarray(0, 4).toString()).toBe('%PDF');

    const logged = await app.prisma.emailMessage.findMany({ where: { inquiryId: id, direction: 'OUT' } });
    expect(logged).toHaveLength(1);
    expect(logged[0]?.status).toBe('SENT');
    expect(logged[0]?.autoSent).toBe(false);

    const again = await app.inject({ method: 'POST', url: `/api/admin/inquiries/${id}/approve-send`, headers: auth() });
    expect(again.statusCode).toBe(409);

    const pdf = await app.inject({ method: 'GET', url: `/api/admin/inquiries/${id}/pdf`, headers: auth() });
    expect(pdf.statusCode).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
  });

  it('question, reject und regenerate-draft', async () => {
    sent.length = 0;
    const created = await app.inject({ method: 'POST', url: '/api/inquiries', payload: standardInquiry(productId, { unloading: 'UNKNOWN' }) });
    const id = created.json().id as string;

    const q = await app.inject({ method: 'POST', url: `/api/admin/inquiries/${id}/question`, headers: auth(), payload: { text: 'Wie wird entladen?' } });
    expect(q.statusCode).toBe(200);
    expect(q.json().status).toBe('QUESTION');
    expect(sent).toHaveLength(1);
    expect(sent[0]?.subject).toContain('Rückfrage');

    const regen = await app.inject({ method: 'POST', url: `/api/admin/inquiries/${id}/regenerate-draft`, headers: auth() });
    expect(regen.statusCode).toBe(200);
    expect(regen.json().aiDraft).toContain('Fragen');

    const rej = await app.inject({ method: 'POST', url: `/api/admin/inquiries/${id}/reject`, headers: auth(), payload: { reason: 'Testablehnung' } });
    expect(rej.statusCode).toBe(200);
    expect(rej.json().status).toBe('REJECTED');
    expect(rej.json().adminNotes).toContain('Testablehnung');

    const missing = await app.inject({ method: 'GET', url: '/api/admin/inquiries/gibtsnicht', headers: auth() });
    expect(missing.statusCode).toBe(404);
  });
});

describe('Admin-Stammdaten', () => {
  it('GET/PUT rules', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/admin/rules', headers: auth() });
    expect(list.statusCode).toBe(200);
    const keys = (list.json() as { key: string; autoAllowed: boolean }[]).map((r) => r.key).sort();
    expect(keys).toEqual(['inquiry_confirmation', 'standard_email_reply', 'standard_offer_send']);
    expect((list.json() as { autoAllowed: boolean }[]).every((r) => r.autoAllowed === false)).toBe(true);

    const put = await app.inject({ method: 'PUT', url: '/api/admin/rules/standard_email_reply', headers: auth(), payload: { autoAllowed: true } });
    expect(put.statusCode).toBe(200);
    expect(put.json().autoAllowed).toBe(true);
    await app.inject({ method: 'PUT', url: '/api/admin/rules/standard_email_reply', headers: auth(), payload: { autoAllowed: false } });

    const bad = await app.inject({ method: 'PUT', url: '/api/admin/rules/gibtsnicht', headers: auth(), payload: { autoAllowed: true } });
    expect(bad.statusCode).toBe(404);
  });

  it('GET/PUT settings mit Validierung', async () => {
    const get = await app.inject({ method: 'GET', url: '/api/admin/settings', headers: auth() });
    expect(get.statusCode).toBe(200);
    expect(get.json().companyName).toBe('Bodenschutz Austria');
    expect(get.json().autoSendEnabled).toBe('false');

    const put = await app.inject({ method: 'PUT', url: '/api/admin/settings', headers: auth(), payload: { maxStandardPallets: 12, companyPhone: '+43 1 234' } });
    expect(put.statusCode).toBe(200);
    expect(put.json().maxStandardPallets).toBe('12');
    expect(put.json().companyPhone).toBe('+43 1 234');
    await app.inject({ method: 'PUT', url: '/api/admin/settings', headers: auth(), payload: { maxStandardPallets: '10', companyPhone: '+43 660 7602201' } });

    const invalid = await app.inject({ method: 'PUT', url: '/api/admin/settings', headers: auth(), payload: { wasteFactor: 'abc', fremd: '1' } });
    expect(invalid.statusCode).toBe(400);
    expect((invalid.json().details as { path: string }[]).map((d) => d.path).sort()).toEqual(['fremd', 'wasteFactor']);
  });

  it('Produkte und Frachtzonen anlegen, ändern, löschen', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/admin/products',
      headers: auth(),
      payload: { slug: 'test-platte', name: 'Testplatte', lengthCm: 200, widthCm: 100, thicknessMm: 10, weightKg: 20, platesPerPallet: 30, loadCapacityTons: 20 },
    });
    expect(created.statusCode).toBe(201);
    const pid = created.json().id as string;
    const upd = await app.inject({ method: 'PUT', url: `/api/admin/products/${pid}`, headers: auth(), payload: { active: false, pricePerPlateCents: 5000 } });
    expect(upd.statusCode).toBe(200);
    expect(upd.json().active).toBe(false);
    const pub = await app.inject({ method: 'GET', url: '/api/products' });
    expect((pub.json() as { id: string }[]).some((p) => p.id === pid)).toBe(false);
    const del = await app.inject({ method: 'DELETE', url: `/api/admin/products/${pid}`, headers: auth() });
    expect(del.statusCode).toBe(200);

    const zone = await app.inject({ method: 'POST', url: '/api/admin/freight-zones', headers: auth(), payload: { name: 'Testzone', postalPrefixes: ['99'], pricePerPalletCents: 100, minimumCents: 200 } });
    expect(zone.statusCode).toBe(201);
    expect(zone.json().postalPrefixes).toEqual(['99']);
    const zid = zone.json().id as string;
    const zupd = await app.inject({ method: 'PUT', url: `/api/admin/freight-zones/${zid}`, headers: auth(), payload: { postalPrefixes: '98, 97' } });
    expect(zupd.json().postalPrefixes).toEqual(['98', '97']);
    const zdel = await app.inject({ method: 'DELETE', url: `/api/admin/freight-zones/${zid}`, headers: auth() });
    expect(zdel.statusCode).toBe(200);
  });

  it('E-Mails: Liste, ignore, send mit Text', async () => {
    sent.length = 0;
    const incoming = await app.prisma.emailMessage.create({
      data: { direction: 'IN', fromAddress: 'kunde@example.com', toAddress: 'info@bodenschutz-austria.at', subject: 'Preis für 100 m²?', textBody: 'Hallo, was kosten 100 m² Platten?', status: 'NEW', messageId: '<in-1@example.com>' },
    });
    const list = await app.inject({ method: 'GET', url: '/api/admin/emails?status=NEW', headers: auth() });
    expect((list.json() as { id: string }[]).some((m) => m.id === incoming.id)).toBe(true);

    const regen = await app.inject({ method: 'POST', url: `/api/admin/emails/${incoming.id}/regenerate-draft`, headers: auth() });
    expect(regen.statusCode).toBe(200);
    expect(regen.json().category).toBe('STANDARD');
    expect(regen.json().aiDraft).toContain('Rechner');

    const send = await app.inject({ method: 'POST', url: `/api/admin/emails/${incoming.id}/send`, headers: auth(), payload: { text: 'Danke für Ihre Anfrage.' } });
    expect(send.statusCode).toBe(200);
    expect(send.json().status).toBe('SENT');
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe('kunde@example.com');
    expect(sent[0]?.subject).toBe('AW: Preis für 100 m²?');
    const out = await app.prisma.emailMessage.findFirst({ where: { inReplyToId: incoming.id } });
    expect(out?.direction).toBe('OUT');

    const other = await app.prisma.emailMessage.create({ data: { direction: 'IN', fromAddress: 'spam@example.com', toAddress: 'x', subject: 'Newsletter', textBody: 'unsubscribe', status: 'NEW' } });
    const ign = await app.inject({ method: 'POST', url: `/api/admin/emails/${other.id}/ignore`, headers: auth() });
    expect(ign.json().status).toBe('IGNORED');
  });

  it('GET /stats liefert Zähler', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/admin/stats', headers: auth() });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.inquiries).toHaveProperty('SENT');
    expect(body.inquiries.SENT).toBeGreaterThanOrEqual(1);
    expect(body.emails).toHaveProperty('IGNORED');
    expect(body.autoSendEnabled).toBe(false);
    expect(body.placeholders.products).toBeGreaterThanOrEqual(2);
  });
});
