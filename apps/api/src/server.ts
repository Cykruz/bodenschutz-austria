import { buildApp } from './app.js';
import { disconnectPrisma } from './db.js';
import { env, isAiConfigured, isImapConfigured } from './env.js';
import { startImapWorker } from './imap-worker.js';

async function main(): Promise<void> {
  const app = await buildApp({
    logger:
      env.NODE_ENV === 'production'
        ? { level: 'info' }
        : { level: 'info', transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } } },
  });

  await app.listen({ port: env.API_PORT, host: env.API_HOST });

  const worker = startImapWorker(app);

  app.log.info(
    `Bodenschutz Austria API läuft auf http://localhost:${env.API_PORT} ` +
      `| KI: ${isAiConfigured() ? `aktiv (${env.ANTHROPIC_MODEL})` : 'nicht konfiguriert (Vorlagentexte)'} ` +
      `| IMAP-Postfach: ${isImapConfigured() ? `aktiv (${env.IMAP_HOST}, alle ${env.IMAP_POLL_SECONDS} s)` : 'aus'} ` +
      `| SMTP: ${env.SMTP_HOST}:${env.SMTP_PORT}`,
  );

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info(`${signal} empfangen, fahre herunter`);
    worker?.stop();
    await app.close();
    await disconnectPrisma();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Start fehlgeschlagen:', err);
  process.exit(1);
});
