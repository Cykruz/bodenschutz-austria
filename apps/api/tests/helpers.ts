import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { getPrisma } from '../src/db.js';

export const ADMIN = { email: 'admin@test.local', password: 'geheim-test-123' };

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp({ logger: false, rateLimits: false, prisma: getPrisma() });
  await app.ready();
  return app;
}

export async function firstProductId(app: FastifyInstance): Promise<string> {
  const res = await app.inject({ method: 'GET', url: '/api/products' });
  const products = res.json() as { id: string }[];
  const first = products[0];
  if (!first) throw new Error('Kein Produkt im Seed');
  return first.id;
}

export async function loginCookie(app: FastifyInstance): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/api/admin/login', payload: ADMIN });
  if (res.statusCode !== 200) throw new Error(`Login fehlgeschlagen: ${res.statusCode} ${res.body}`);
  const setCookie = res.headers['set-cookie'];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!raw) throw new Error('Kein Cookie gesetzt');
  return raw.split(';')[0] ?? '';
}

export function standardInquiry(productId: string, overrides: Record<string, unknown> = {}) {
  return {
    projectType: 'CONSTRUCTION',
    mode: 'AREA',
    areaM2: 100,
    productId,
    customerName: 'Test Kundin',
    email: 'kundin@example.com',
    phone: '+43 660 0000000',
    street: 'Teststraße 1',
    postalCode: '3362',
    city: 'Mauer',
    unloading: 'FORKLIFT',
    channel: 'WEB',
    ...overrides,
  };
}
