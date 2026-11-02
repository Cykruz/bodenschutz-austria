/**
 * Datenbank einrichten oder zurücksetzen (aus apps/api heraus: npm run db:setup | db:reset).
 * Löst DATABASE_URL auf einen absoluten Pfad auf, damit Prisma CLI und Client dieselbe Datei nutzen.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { API_ROOT, env, ensureDataDirs } from '../src/env.js';

const command = process.argv[2] ?? 'setup';
const dbFile = env.DATABASE_URL.startsWith('file:') ? (env.DATABASE_URL.slice('file:'.length).split('?')[0] ?? '') : '';

function run(cmd: string): void {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: API_ROOT, stdio: 'inherit', env: { ...process.env, DATABASE_URL: env.DATABASE_URL } });
}

if (command === 'reset') {
  if (dbFile) {
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      const f = `${dbFile}${suffix}`;
      if (fs.existsSync(f)) {
        fs.rmSync(f);
        console.log(`gelöscht: ${path.relative(API_ROOT, f)}`);
      }
    }
  }
}

ensureDataDirs();
run('npx prisma generate');
run('npx prisma db push --skip-generate');
run('npx tsx prisma/seed.ts');
console.log(`Datenbank bereit: ${dbFile || env.DATABASE_URL}`);
