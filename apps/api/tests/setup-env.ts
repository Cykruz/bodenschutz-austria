import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Läuft vor jeder Testdatei: Umgebung für die Test-Datenbank, keine KI, kein IMAP.
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TEST_DB_FILE = path.join(apiRoot, 'data', 'test.db');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = `file:${TEST_DB_FILE.replace(/\\/g, '/')}`;
process.env.SESSION_SECRET = 'test-session-secret-mit-mindestens-32-zeichen';
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'geheim-test-123';
process.env.ANTHROPIC_API_KEY = '';
process.env.IMAP_HOST = '';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '1025';
process.env.MAIL_FROM = 'Bodenschutz Austria Test <test@bodenschutz-austria.at>';
