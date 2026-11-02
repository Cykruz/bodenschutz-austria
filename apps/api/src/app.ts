import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import type { PrismaClient } from '@prisma/client';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { setAiLogger } from './ai.js';
import { getPrisma } from './db.js';
import { ensureDataDirs, env } from './env.js';
import { HttpError } from './errors.js';
import { ADMIN_COOKIE, adminRoutes } from './routes/admin.js';
import { publicRoutes } from './routes/public.js';
import { MAX_UPLOAD_BYTES } from './upload.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { sub: string; email: string };
  }
}

export interface BuildAppOptions {
  logger?: FastifyServerOptions['logger'];
  prisma?: PrismaClient;
  /** Rate-Limits aktiv (Standard true; Tests schalten sie aus) */
  rateLimits?: boolean;
}

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
const EXPO_ORIGIN = /^exp:\/\//;

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // native Apps, curl, Server-zu-Server
  const allowList = new Set([env.PUBLIC_WEB_URL.replace(/\/$/, ''), 'http://localhost:3000', 'http://localhost:8081']);
  if (allowList.has(origin.replace(/\/$/, ''))) return true;
  if (env.NODE_ENV !== 'production' && (LOCAL_ORIGIN.test(origin) || EXPO_ORIGIN.test(origin))) return true;
  return false;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  ensureDataDirs();
  const app = Fastify({
    logger: options.logger ?? false,
    trustProxy: true,
    bodyLimit: 1024 * 1024,
  });

  const prisma = options.prisma ?? getPrisma();
  app.decorate('prisma', prisma);
  setAiLogger(app.log);

  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // reine JSON-API, kein HTML
  });
  await app.register(cors, {
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) cb(null, true);
      else cb(new HttpError(403, 'Origin nicht erlaubt'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await app.register(rateLimit, { global: false });
  await app.register(cookie);
  await app.register(jwt, {
    secret: env.SESSION_SECRET,
    cookie: { cookieName: ADMIN_COOKIE, signed: false },
  });
  await app.register(multipart, {
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 },
    throwFileSizeLimit: true,
  });

  app.setErrorHandler((error, request, reply) => {
    const err = error as Error & { statusCode?: number; code?: string; validation?: unknown; details?: unknown };
    if (err instanceof HttpError) {
      return reply.code(err.statusCode).send({ error: err.message, ...(err.details !== undefined ? { details: err.details } : {}) });
    }
    if (err.code === 'FST_REQ_FILE_TOO_LARGE') {
      return reply.code(413).send({ error: 'Datei größer als 8 MB' });
    }
    if (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 500) {
      return reply.code(err.statusCode).send({ error: err.message });
    }
    request.log.error({ err }, 'Unerwarteter Fehler');
    return reply.code(500).send({ error: 'Interner Fehler' });
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: 'Nicht gefunden' });
  });

  const rateLimits = options.rateLimits ?? true;
  await app.register(publicRoutes, { prefix: '/api', rateLimits });
  await app.register(adminRoutes, { prefix: '/api/admin', rateLimits });

  return app;
}
