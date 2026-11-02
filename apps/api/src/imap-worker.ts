import type { FastifyInstance } from 'fastify';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { classifyEmail, draftEmailReply } from './ai.js';
import { env, isImapConfigured, mailFromAddress } from './env.js';
import { sendMail } from './mail.js';
import { evaluateAutoSend } from './policy.js';
import { getSettings } from './settings.js';

export interface ImapWorkerHandle {
  stop: () => void;
  pollOnce: () => Promise<void>;
}

interface ParsedIncoming {
  messageId: string | null;
  fromAddress: string;
  toAddress: string;
  subject: string;
  textBody: string;
  receivedAt: Date;
}

/** Verarbeitet eine eingehende Mail: speichern, einordnen, Entwurf, ggf. automatisch senden. */
export async function processIncomingEmail(app: FastifyInstance, mail: ParsedIncoming): Promise<'stored' | 'duplicate' | 'own'> {
  const prisma = app.prisma;
  const ownAddresses = new Set([mailFromAddress(), (env.IMAP_USER ?? '').toLowerCase()].filter((a) => a.length > 0));
  if (ownAddresses.has(mail.fromAddress.toLowerCase())) return 'own';
  if (mail.messageId) {
    const dup = await prisma.emailMessage.findFirst({ where: { messageId: mail.messageId, direction: 'IN' } });
    if (dup) return 'duplicate';
  }

  const record = await prisma.emailMessage.create({
    data: {
      direction: 'IN',
      messageId: mail.messageId,
      fromAddress: mail.fromAddress,
      toAddress: mail.toAddress,
      subject: mail.subject,
      textBody: mail.textBody,
      receivedAt: mail.receivedAt,
      status: 'NEW',
    },
  });

  const incoming = { fromAddress: mail.fromAddress, subject: mail.subject, textBody: mail.textBody };
  const classification = await classifyEmail(incoming);
  if (classification.category === 'UNRELATED') {
    await prisma.emailMessage.update({ where: { id: record.id }, data: { category: 'UNRELATED' } });
    app.log.info({ emailId: record.id, reason: classification.reason }, 'E-Mail als UNRELATED eingeordnet');
    return 'stored';
  }

  const [products, settings] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    getSettings(prisma),
  ]);
  const draft = await draftEmailReply(incoming, classification.category, products, settings);
  await prisma.emailMessage.update({
    where: { id: record.id },
    data: { category: classification.category, aiDraft: draft, status: 'DRAFT' },
  });

  const decision = await evaluateAutoSend(prisma, 'standard_email_reply', classification.category);
  if (!decision.allowed) {
    app.log.info({ emailId: record.id, category: classification.category, reasons: decision.reasons }, 'E-Mail-Entwurf wartet auf Freigabe');
    return 'stored';
  }
  try {
    const subject = /^(re|aw):/i.test(mail.subject) ? mail.subject : `AW: ${mail.subject}`;
    await sendMail(prisma, {
      to: mail.fromAddress,
      subject,
      text: draft,
      inReplyToId: record.id,
      inReplyToMessageId: mail.messageId,
      autoSent: true,
    });
    await prisma.emailMessage.update({ where: { id: record.id }, data: { status: 'SENT', autoSent: true } });
    app.log.info({ emailId: record.id }, 'Standard-E-Mail automatisch beantwortet');
  } catch (err) {
    app.log.error({ err, emailId: record.id }, 'Automatische Antwort fehlgeschlagen, Entwurf bleibt erhalten');
  }
  return 'stored';
}

async function pollMailbox(app: FastifyInstance): Promise<void> {
  const client = new ImapFlow({
    host: env.IMAP_HOST ?? '',
    port: env.IMAP_PORT,
    secure: env.IMAP_SECURE,
    auth: { user: env.IMAP_USER ?? '', pass: env.IMAP_PASS ?? '' },
    logger: false,
    socketTimeout: 60_000,
  });
  client.on('error', (err: unknown) => app.log.warn({ err }, 'IMAP-Verbindungsfehler'));
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    const uids = await client.search({ seen: false }, { uid: true });
    const list = Array.isArray(uids) ? uids : [];
    if (list.length === 0) return;
    app.log.info({ count: list.length }, 'Neue E-Mails im Postfach');
    for (const uid of list) {
      try {
        const msg = await client.fetchOne(String(uid), { source: true, envelope: true, internalDate: true }, { uid: true });
        if (!msg || !msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const fromAddress = parsed.from?.value?.[0]?.address?.toLowerCase() ?? '';
        const toValue = parsed.to;
        const toList = Array.isArray(toValue) ? toValue : toValue ? [toValue] : [];
        const toAddress = toList[0]?.value?.[0]?.address?.toLowerCase() ?? (env.IMAP_USER ?? '');
        const textBody = (parsed.text ?? '').trim() || (parsed.html ? String(parsed.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '');
        if (!fromAddress) {
          await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
          continue;
        }
        const result = await processIncomingEmail(app, {
          messageId: parsed.messageId ?? null,
          fromAddress,
          toAddress,
          subject: (parsed.subject ?? '(kein Betreff)').slice(0, 500),
          textBody: textBody.slice(0, 20000),
          receivedAt: parsed.date ?? (msg.internalDate instanceof Date ? msg.internalDate : new Date()),
        });
        await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
        app.log.info({ uid, result, fromAddress }, 'E-Mail verarbeitet');
      } catch (err) {
        app.log.error({ err, uid }, 'E-Mail konnte nicht verarbeitet werden');
      }
    }
  } finally {
    lock.release();
    try {
      await client.logout();
    } catch {
      // Verbindung ist ggf. schon weg
    }
  }
}

/** Startet den Postfach-Worker, wenn IMAP_HOST gesetzt ist; sonst null. */
export function startImapWorker(app: FastifyInstance): ImapWorkerHandle | null {
  if (!isImapConfigured()) return null;
  let running = false;
  let stopped = false;
  const pollOnce = async () => {
    if (running || stopped) return;
    running = true;
    try {
      await pollMailbox(app);
    } catch (err) {
      app.log.warn({ err: err instanceof Error ? err.message : err }, 'IMAP-Abruf fehlgeschlagen, nächster Versuch beim nächsten Intervall');
    } finally {
      running = false;
    }
  };
  const intervalMs = Math.max(15, env.IMAP_POLL_SECONDS) * 1000;
  const timer = setInterval(() => void pollOnce(), intervalMs);
  setTimeout(() => void pollOnce(), 2000).unref();
  return {
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
    pollOnce,
  };
}
