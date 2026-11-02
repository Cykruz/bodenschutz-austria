import type { EmailMessage, PrismaClient } from '@prisma/client';
import nodemailer, { type Transporter } from 'nodemailer';
import { AI_FOOTER } from './ai.js';
import { env, mailFromAddress } from './env.js';

export interface MailAttachment {
  filename: string;
  path?: string;
  content?: Buffer;
  contentType?: string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  attachments?: MailAttachment[];
  inquiryId?: string | null;
  /** ID der beantworteten EmailMessage (IN) */
  inReplyToId?: string | null;
  /** RFC-Message-ID der beantworteten Mail (für In-Reply-To-Header) */
  inReplyToMessageId?: string | null;
  autoSent?: boolean;
  /** KI-Fußzeile anhängen (Standard: true) */
  withAiFooter?: boolean;
}

let transporter: Transporter | undefined;

export function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } } : {}),
    });
  }
  return transporter;
}

/** Nur für Tests: Transport zurücksetzen. */
export function resetTransporter(): void {
  transporter = undefined;
}

export function withFooter(text: string): string {
  return text.includes(AI_FOOTER) ? text : `${text.trimEnd()}\n\n--\n${AI_FOOTER}`;
}

/** Sendet eine E-Mail per SMTP und protokolliert sie als EmailMessage OUT. */
export async function sendMail(prisma: PrismaClient, opts: SendMailOptions): Promise<EmailMessage> {
  const text = opts.withAiFooter === false ? opts.text : withFooter(opts.text);
  const info = await getTransporter().sendMail({
    from: env.MAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    text,
    ...(opts.inReplyToMessageId ? { inReplyTo: opts.inReplyToMessageId, references: opts.inReplyToMessageId } : {}),
    attachments: (opts.attachments ?? []).map((a) => ({
      filename: a.filename,
      ...(a.path ? { path: a.path } : {}),
      ...(a.content ? { content: a.content } : {}),
      ...(a.contentType ? { contentType: a.contentType } : {}),
    })),
  });
  const messageId = typeof (info as { messageId?: unknown })?.messageId === 'string' ? (info as { messageId: string }).messageId : null;
  return prisma.emailMessage.create({
    data: {
      direction: 'OUT',
      messageId,
      fromAddress: mailFromAddress(),
      toAddress: opts.to,
      subject: opts.subject,
      textBody: text,
      status: 'SENT',
      inquiryId: opts.inquiryId ?? null,
      inReplyToId: opts.inReplyToId ?? null,
      autoSent: opts.autoSent ?? false,
    },
  });
}
