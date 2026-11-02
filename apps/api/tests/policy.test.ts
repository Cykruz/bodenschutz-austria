import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { decideAutoSend, evaluateAutoSend } from '../src/policy.js';
import { processIncomingEmail } from '../src/imap-worker.js';
import { createTestApp } from './helpers.js';

const sendMailMock = vi.hoisted(() => vi.fn(async () => ({ messageId: '<policy@mock.local>' })));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail: sendMailMock }) } }));

describe('decideAutoSend (rein)', () => {
  it('verbietet alles, solange autoSendEnabled=false', () => {
    const d = decideAutoSend({ autoSendEnabled: false, ruleKey: 'standard_email_reply', ruleAllowed: true, category: 'STANDARD' });
    expect(d.allowed).toBe(false);
    expect(d.reasons[0]).toContain('autoSendEnabled');
  });
  it('verbietet ohne Regel-Freigabe', () => {
    expect(decideAutoSend({ autoSendEnabled: true, ruleKey: 'inquiry_confirmation', ruleAllowed: false }).allowed).toBe(false);
    expect(decideAutoSend({ autoSendEnabled: true, ruleKey: 'inquiry_confirmation', ruleAllowed: undefined }).allowed).toBe(false);
  });
  it('verbietet REVIEW und UNRELATED immer', () => {
    expect(decideAutoSend({ autoSendEnabled: true, ruleKey: 'standard_email_reply', ruleAllowed: true, category: 'REVIEW' }).allowed).toBe(false);
    expect(decideAutoSend({ autoSendEnabled: true, ruleKey: 'standard_email_reply', ruleAllowed: true, category: 'UNRELATED' }).allowed).toBe(false);
  });
  it('erlaubt nur mit Schalter + Regel + STANDARD', () => {
    expect(decideAutoSend({ autoSendEnabled: true, ruleKey: 'standard_email_reply', ruleAllowed: true, category: 'STANDARD' }).allowed).toBe(true);
    expect(decideAutoSend({ autoSendEnabled: true, ruleKey: 'inquiry_confirmation', ruleAllowed: true }).allowed).toBe(true);
  });
});

describe('evaluateAutoSend und Postfach-Verarbeitung (mit Datenbank)', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.prisma.setting.update({ where: { key: 'autoSendEnabled' }, data: { value: 'false' } });
    await app.prisma.approvalRule.update({ where: { key: 'standard_email_reply' }, data: { autoAllowed: false } });
    await app.close();
  });

  it('Seed-Zustand: nichts erlaubt', async () => {
    for (const key of ['inquiry_confirmation', 'standard_offer_send', 'standard_email_reply'] as const) {
      const d = await evaluateAutoSend(app.prisma, key, 'STANDARD');
      expect(d.allowed, key).toBe(false);
    }
  });

  it('eingehende Standard-Mail wird gespeichert, eingeordnet und bleibt DRAFT ohne Freigabe', async () => {
    sendMailMock.mockClear();
    const result = await processIncomingEmail(app, {
      messageId: '<worker-1@example.com>',
      fromAddress: 'kunde@example.com',
      toAddress: 'info@bodenschutz-austria.at',
      subject: 'Angebot für Bodenplatten',
      textBody: 'Hallo, ich brauche Platten für eine Baustelle, ca. 80 m². Was kostet das?',
      receivedAt: new Date(),
    });
    expect(result).toBe('stored');
    const mail = await app.prisma.emailMessage.findFirstOrThrow({ where: { messageId: '<worker-1@example.com>' } });
    expect(mail.category).toBe('STANDARD');
    expect(mail.status).toBe('DRAFT');
    expect(mail.aiDraft).toContain('Rechner');
    expect(sendMailMock).not.toHaveBeenCalled();

    // Duplikat und eigene Absenderadresse werden ignoriert
    expect(await processIncomingEmail(app, { messageId: '<worker-1@example.com>', fromAddress: 'kunde@example.com', toAddress: 'x', subject: 's', textBody: 't', receivedAt: new Date() })).toBe('duplicate');
    expect(await processIncomingEmail(app, { messageId: '<own@example.com>', fromAddress: 'test@bodenschutz-austria.at', toAddress: 'x', subject: 's', textBody: 't', receivedAt: new Date() })).toBe('own');
  });

  it('mit Schalter + Regel wird nur STANDARD automatisch beantwortet, REVIEW nie', async () => {
    sendMailMock.mockClear();
    await app.prisma.setting.update({ where: { key: 'autoSendEnabled' }, data: { value: 'true' } });
    await app.prisma.approvalRule.update({ where: { key: 'standard_email_reply' }, data: { autoAllowed: true } });

    await processIncomingEmail(app, {
      messageId: '<worker-2@example.com>',
      fromAddress: 'kunde2@example.com',
      toAddress: 'info@bodenschutz-austria.at',
      subject: 'Preis Bodenschutzplatten',
      textBody: 'Was kosten Ihre Platten für ein Event?',
      receivedAt: new Date(),
    });
    const std = await app.prisma.emailMessage.findFirstOrThrow({ where: { messageId: '<worker-2@example.com>' } });
    expect(std.status).toBe('SENT');
    expect(std.autoSent).toBe(true);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const reply = await app.prisma.emailMessage.findFirst({ where: { inReplyToId: std.id } });
    expect(reply?.direction).toBe('OUT');
    expect(reply?.autoSent).toBe(true);

    await processIncomingEmail(app, {
      messageId: '<worker-3@example.com>',
      fromAddress: 'kunde3@example.com',
      toAddress: 'info@bodenschutz-austria.at',
      subject: 'Miete von Platten mit Rabatt',
      textBody: 'Können wir 500 Platten mieten, dringend?',
      receivedAt: new Date(),
    });
    const review = await app.prisma.emailMessage.findFirstOrThrow({ where: { messageId: '<worker-3@example.com>' } });
    expect(review.category).toBe('REVIEW');
    expect(review.status).toBe('DRAFT');
    expect(sendMailMock).toHaveBeenCalledTimes(1);

    await processIncomingEmail(app, {
      messageId: '<worker-4@example.com>',
      fromAddress: 'news@example.com',
      toAddress: 'info@bodenschutz-austria.at',
      subject: 'Newsletter Oktober',
      textBody: 'Jetzt unsubscribe',
      receivedAt: new Date(),
    });
    const unrelated = await app.prisma.emailMessage.findFirstOrThrow({ where: { messageId: '<worker-4@example.com>' } });
    expect(unrelated.category).toBe('UNRELATED');
    expect(unrelated.aiDraft).toBeNull();
  });
});
