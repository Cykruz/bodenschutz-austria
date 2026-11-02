import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, firstProductId, standardInquiry } from './helpers.js';

let app: FastifyInstance;
let productId: string;

beforeAll(async () => {
  app = await createTestApp();
  productId = await firstProductId(app);
});
afterAll(async () => {
  await app.close();
});

describe('öffentliche Endpunkte', () => {
  it('GET /api/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('GET /api/products liefert aktive Produkte als ProductSpec mit description/material', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/products' });
    expect(res.statusCode).toBe(200);
    const products = res.json() as Record<string, unknown>[];
    expect(products.length).toBeGreaterThanOrEqual(2);
    const p = products[0]!;
    for (const key of ['id', 'name', 'lengthCm', 'widthCm', 'thicknessMm', 'weightKg', 'platesPerPallet', 'pricePerPlateCents', 'loadCapacityTons', 'isPlaceholder', 'description', 'material']) {
      expect(p, key).toHaveProperty(key);
    }
    expect(p.name).toBe('classicXtreme');
    expect(p.isPlaceholder).toBe(true);
  });

  it('POST /api/calculate rechnet mit Frachtzone und Platzhalter-Flag', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/calculate',
      payload: { projectType: 'CONSTRUCTION', mode: 'AREA', areaM2: 100, postalCode: '3362', productId },
    });
    expect(res.statusCode).toBe(200);
    const calc = res.json();
    expect(calc.areaM2).toBe(100);
    expect(calc.plates).toBe(37);
    expect(calc.pallets).toBe(2);
    expect(calc.alternative).toBeDefined();
    expect(calc.pricing.isPreliminary).toBe(true);
    expect(calc.pricing.hasPlaceholderData).toBe(true);
    expect(calc.pricing.freightZone).toContain('Ost');
    expect(Array.isArray(calc.assumptions)).toBe(true);
  });

  it('POST /api/calculate mit Fahrspuren nutzt Standardwerte', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/calculate',
      payload: { projectType: 'CONSTRUCTION', mode: 'LANES', lengthM: 50, productId },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().areaM2).toBe(120);
  });

  it('POST /api/calculate validiert Eingaben', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/calculate', payload: { projectType: 'X', mode: 'AREA', productId } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain('ungültig');
    const noArea = await app.inject({ method: 'POST', url: '/api/calculate', payload: { projectType: 'EVENT', mode: 'AREA', productId } });
    expect(noArea.statusCode).toBe(400);
    const badProduct = await app.inject({ method: 'POST', url: '/api/calculate', payload: { projectType: 'EVENT', mode: 'AREA', areaM2: 10, productId: 'nope' } });
    expect(badProduct.statusCode).toBe(400);
  });

  it('POST /api/photo/analyze lehnt Nicht-Bilder ab und akzeptiert PNG (Fallback ohne KI)', async () => {
    const boundary = 'xTESTx';
    const build = (name: string, mime: string, content: Buffer) =>
      Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="${name}"\r\nContent-Type: ${mime}\r\n\r\n`),
        content,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
    const headers = { 'content-type': `multipart/form-data; boundary=${boundary}` };

    const bad = await app.inject({ method: 'POST', url: '/api/photo/analyze', headers, payload: build('x.png', 'image/png', Buffer.from('kein bild')) });
    expect(bad.statusCode).toBe(400);

    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000100e221bc330000000049454e44ae426082', 'hex');
    const ok = await app.inject({ method: 'POST', url: '/api/photo/analyze', headers, payload: build('x.png', 'image/png', png) });
    expect(ok.statusCode).toBe(200);
    const body = ok.json();
    expect(body.photoId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.suitability).toBe('UNCLEAR');
    expect(body.isOrientationOnly).toBe(true);
    expect(body.disclosure).toContain('KI-System');
  });

  it('GET /api/inquiries/:id/public liefert nur Status', async () => {
    const created = await app.inject({ method: 'POST', url: '/api/inquiries', payload: standardInquiry(productId) });
    expect(created.statusCode).toBe(201);
    const id = created.json().id as string;
    const res = await app.inject({ method: 'GET', url: `/api/inquiries/${id}/public` });
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.json()).sort()).toEqual(['createdAt', 'id', 'status']);
    const missing = await app.inject({ method: 'GET', url: '/api/inquiries/gibtsnicht/public' });
    expect(missing.statusCode).toBe(404);
  });

  it('POST /api/chat antwortet ohne KI-Schlüssel mit Hinweis und Disclosure', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: { channel: 'WEB', messages: [{ role: 'user', content: 'Was kosten die Platten?' }] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.sessionId).toBeTruthy();
    expect(body.reply).toContain('noch nicht konfiguriert');
    expect(body.reply).toContain('KI-System');
    expect(body.disclosure).toBe('Dieser Assistent ist ein KI-System von Bodenschutz Austria. Verbindliche Auskünfte gibt das Team persönlich.');

    const again = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: { sessionId: body.sessionId, channel: 'WEB', messages: [{ role: 'user', content: 'Hallo' }, { role: 'assistant', content: body.reply }, { role: 'user', content: 'Und Lieferzeit?' }] },
    });
    expect(again.statusCode).toBe(200);
    expect(again.json().sessionId).toBe(body.sessionId);
    const count = await app.prisma.chatMessage.count({ where: { sessionId: body.sessionId } });
    expect(count).toBe(4);
  });

  it('POST /api/chat verlangt eine Nutzernachricht am Ende', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/chat', payload: { channel: 'APP', messages: [{ role: 'assistant', content: 'Hi' }] } });
    expect(res.statusCode).toBe(400);
  });

  it('CORS erlaubt Web-Origin und lehnt fremde Origins ab', async () => {
    const ok = await app.inject({ method: 'GET', url: '/api/health', headers: { origin: 'http://localhost:3000' } });
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    const bad = await app.inject({ method: 'GET', url: '/api/health', headers: { origin: 'https://boese-seite.example' } });
    expect(bad.statusCode).toBe(403);
  });
});
