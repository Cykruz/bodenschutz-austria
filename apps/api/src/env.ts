import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

/** Wurzel von apps/api (funktioniert aus src/ und aus dist/). */
export const API_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** Repo-Root (zwei Ebenen über apps/api). */
export const REPO_ROOT = path.resolve(API_ROOT, '..', '..');

// Reihenfolge: echte Prozess-Umgebung > apps/api/.env (lokal) > Repo-Root .env
dotenv.config({ path: path.join(API_ROOT, '.env'), quiet: true });
dotenv.config({ path: path.join(REPO_ROOT, '.env'), quiet: true });

const boolFromString = z
  .string()
  .optional()
  .transform((v) => (v ?? '').trim().toLowerCase() === 'true');

const intFromString = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((v) => {
      const n = Number.parseInt((v ?? '').trim(), 10);
      return Number.isFinite(n) ? n : fallback;
    });

const optionalString = z
  .string()
  .optional()
  .transform((v) => {
    const t = (v ?? '').trim();
    return t.length > 0 ? t : undefined;
  });

const envSchema = z.object({
  NODE_ENV: z.string().optional().transform((v) => v ?? 'development'),
  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL: z.string().optional().transform((v) => (v && v.trim()) || 'claude-sonnet-5-5'),
  DATABASE_URL: z.string().optional().transform((v) => (v && v.trim()) || 'file:./data/app.db'),
  API_PORT: intFromString(4000),
  API_HOST: z.string().optional().transform((v) => (v && v.trim()) || '0.0.0.0'),
  PUBLIC_WEB_URL: z.string().optional().transform((v) => (v && v.trim()) || 'http://localhost:3000'),
  PUBLIC_API_URL: z.string().optional().transform((v) => (v && v.trim()) || 'http://localhost:4000'),
  SESSION_SECRET: z.string().optional().transform((v) => (v && v.trim()) || ''),
  ADMIN_EMAIL: optionalString,
  ADMIN_PASSWORD: optionalString,
  SMTP_HOST: z.string().optional().transform((v) => (v && v.trim()) || 'localhost'),
  SMTP_PORT: intFromString(1025),
  SMTP_SECURE: boolFromString,
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  MAIL_FROM: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().replace(/^"|"$/g, '')) || 'Bodenschutz Austria <office@bodenschutz-austria.at>'),
  IMAP_HOST: optionalString,
  IMAP_PORT: intFromString(993),
  IMAP_SECURE: z
    .string()
    .optional()
    .transform((v) => (v === undefined || v.trim() === '' ? true : v.trim().toLowerCase() === 'true')),
  IMAP_USER: optionalString,
  IMAP_PASS: optionalString,
  IMAP_POLL_SECONDS: intFromString(60),
});

export type Env = z.infer<typeof envSchema> & { DATABASE_URL: string; SESSION_SECRET: string };

function resolveDatabaseUrl(raw: string): string {
  if (!raw.startsWith('file:')) return raw;
  const rest = raw.slice('file:'.length).split('?')[0] ?? '';
  if (rest.length === 0) return raw;
  const abs = path.isAbsolute(rest) ? rest : path.resolve(API_ROOT, rest);
  return `file:${abs.replace(/\\/g, '/')}`;
}

function buildEnv(): Env {
  const parsed = envSchema.parse(process.env);
  const isProd = parsed.NODE_ENV === 'production';
  let secret = parsed.SESSION_SECRET;
  if (secret.length < 32) {
    if (isProd) {
      throw new Error('SESSION_SECRET muss in Produktion mindestens 32 Zeichen lang sein');
    }
    // Entwicklung/Test: unsicherer, aber lauffähiger Standard (Sitzungen gelten nur für diesen Prozess)
    secret = secret.length > 0 ? secret.padEnd(32, '0') : 'dev-only-session-secret-please-change-me';
  }
  return { ...parsed, DATABASE_URL: resolveDatabaseUrl(parsed.DATABASE_URL), SESSION_SECRET: secret };
}

export const env: Env = buildEnv();

export const paths = {
  dataDir: path.join(API_ROOT, 'data'),
  uploadsDir: path.join(API_ROOT, 'data', 'uploads'),
  pdfDir: path.join(API_ROOT, 'data', 'pdf'),
};

export function ensureDataDirs(): void {
  for (const dir of [paths.dataDir, paths.uploadsDir, paths.pdfDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (env.DATABASE_URL.startsWith('file:')) {
    const dbFile = env.DATABASE_URL.slice('file:'.length).split('?')[0] ?? '';
    if (dbFile) fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  }
}

/** E-Mail-Adresse aus MAIL_FROM („Name <adresse>“ oder nur Adresse). */
export function mailFromAddress(): string {
  const m = /<([^>]+)>/.exec(env.MAIL_FROM);
  return (m?.[1] ?? env.MAIL_FROM).trim().toLowerCase();
}

export const isAiConfigured = (): boolean => Boolean(env.ANTHROPIC_API_KEY);
export const isImapConfigured = (): boolean => Boolean(env.IMAP_HOST);
