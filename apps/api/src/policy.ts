import type { PrismaClient } from '@prisma/client';
import { getSettings } from './settings.js';

/**
 * Zentrale Freigabe-Logik: Nichts geht automatisch raus, solange autoSendEnabled=false.
 * Zusätzlich muss die jeweilige Regel freigegeben sein und – falls eine Kategorie
 * vorliegt – diese STANDARD sein. Prüffälle (REVIEW) gehen immer an den Menschen.
 */
export type AutoSendRuleKey = 'inquiry_confirmation' | 'standard_offer_send' | 'standard_email_reply';
export type Category = 'STANDARD' | 'REVIEW' | 'UNRELATED';

export interface PolicyDecision {
  allowed: boolean;
  reasons: string[];
}

export interface PolicyInput {
  autoSendEnabled: boolean;
  ruleKey: AutoSendRuleKey;
  ruleAllowed: boolean | undefined;
  category?: Category | undefined;
}

/** Reine Entscheidungsfunktion (testbar ohne Datenbank). */
export function decideAutoSend(input: PolicyInput): PolicyDecision {
  const reasons: string[] = [];
  if (!input.autoSendEnabled) reasons.push('Automatischer Versand ist global deaktiviert (autoSendEnabled=false)');
  if (input.ruleAllowed === undefined) reasons.push(`Regel „${input.ruleKey}“ ist nicht vorhanden`);
  else if (!input.ruleAllowed) reasons.push(`Regel „${input.ruleKey}“ ist nicht für automatischen Versand freigegeben`);
  if (input.category !== undefined && input.category !== 'STANDARD') {
    reasons.push(`Kategorie ${input.category} geht immer an den Menschen`);
  }
  return { allowed: reasons.length === 0, reasons };
}

export async function evaluateAutoSend(
  prisma: PrismaClient,
  ruleKey: AutoSendRuleKey,
  category?: Category,
): Promise<PolicyDecision> {
  const [settings, rule] = await Promise.all([getSettings(prisma), prisma.approvalRule.findUnique({ where: { key: ruleKey } })]);
  return decideAutoSend({
    autoSendEnabled: settings.autoSendEnabled,
    ruleKey,
    ruleAllowed: rule?.autoAllowed,
    category,
  });
}
