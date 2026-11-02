import { z } from 'zod';

const dezimal = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, { error: `Bitte ${label} eingeben.` })
    .transform((s) => Number(s.replace(',', '.')))
    .refine((n) => Number.isFinite(n), { error: `${label}: bitte nur Zahlen eingeben, z. B. 120 oder 85,5.` })
    .refine((n) => n >= min, { error: `${label}: mindestens ${min}.` })
    .refine((n) => n <= max, { error: `${label}: höchstens ${max}. Für größere Projekte bitte kurz anrufen.` });

export const massenSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('AREA'),
    areaM2: dezimal('Fläche in m²', 1, 100000),
    productId: z.string().min(1, { error: 'Bitte ein Produkt auswählen.' }),
    postalCode: z.string().trim().regex(/^(\d{4})?$/, { error: 'Bitte eine österreichische PLZ mit 4 Ziffern eingeben.' }),
  }),
  z.object({
    mode: z.literal('LANES'),
    lengthM: dezimal('Streckenlänge in m', 1, 10000),
    laneCount: z.number().int().min(1).max(4),
    productId: z.string().min(1, { error: 'Bitte ein Produkt auswählen.' }),
    postalCode: z.string().trim().regex(/^(\d{4})?$/, { error: 'Bitte eine österreichische PLZ mit 4 Ziffern eingeben.' }),
  }),
]);

export type MassenInput = z.infer<typeof massenSchema>;

export const kontaktSchema = z.object({
  customerName: z.string().trim().min(2, { error: 'Bitte deinen Namen eingeben.' }).max(120),
  email: z.email({ error: 'Bitte eine gültige E-Mail-Adresse eingeben, z. B. name@firma.at.' }).trim().max(200),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v === '' || /^[+\d][\d\s()/-]{5,}$/.test(v), { error: 'Bitte eine gültige Telefonnummer eingeben, z. B. +43 660 1234567.' }),
  street: z.string().trim().max(160),
  postalCode: z.string().trim().regex(/^\d{4}$/, { error: 'Bitte die Liefer-PLZ mit 4 Ziffern eingeben.' }),
  city: z.string().trim().min(2, { error: 'Bitte den Ort eingeben.' }).max(120),
  unloading: z.enum(['FORKLIFT', 'CRANE_NEEDED', 'UNKNOWN'], { error: 'Bitte wähle, wie vor Ort entladen werden kann.' }),
  notes: z.string().trim().max(2000, { error: 'Bitte höchstens 2000 Zeichen.' }),
  rentalRequested: z.boolean(),
  privacy: z.literal(true, { error: 'Bitte bestätige die Datenschutzerklärung.' }),
});

export type KontaktInput = z.infer<typeof kontaktSchema>;

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export const loginSchema = z.object({
  email: z.email({ error: 'Bitte eine gültige E-Mail-Adresse eingeben.' }),
  password: z.string().min(1, { error: 'Bitte das Passwort eingeben.' }),
});
