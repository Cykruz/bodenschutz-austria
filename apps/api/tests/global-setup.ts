import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Einmal pro Testlauf: frische SQLite-Datei, Schema pushen, Seed.
export default async function globalSetup(): Promise<void> {
  const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dbFile = path.join(apiRoot, 'data', 'test.db');
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    if (fs.existsSync(dbFile + suffix)) fs.rmSync(dbFile + suffix);
  }
  const databaseUrl = `file:${dbFile.replace(/\\/g, '/')}`;
  execSync('npx prisma db push --skip-generate', {
    cwd: apiRoot,
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  process.env.DATABASE_URL = databaseUrl;
  process.env.NODE_ENV = 'test';
  const { PrismaClient } = await import('@prisma/client');
  const { seedDatabase } = await import('../prisma/seed.js');
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    await seedDatabase(prisma, { adminEmail: 'admin@test.local', adminPassword: 'geheim-test-123' });
  } finally {
    await prisma.$disconnect();
  }
}
