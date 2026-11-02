import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, View, type TextInputInstance } from 'react-native';
import { z } from 'zod';

import { Screen } from '@/components/Screen';
import {
  AppText,
  Body,
  Button,
  Card,
  Heading,
  InfoBanner,
  Input,
  SelectCard,
  Small,
  Stepper,
  Title,
} from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useInquiry, WIZARD_STEPS, type ContactData } from '@/context/InquiryContext';
import { PRIVACY_URL } from '@/lib/config';
import type { Unloading } from '@/lib/types';

const contactSchema = z.object({
  customerName: z.string().trim().min(2, 'Bitte Ihren Namen eingeben.'),
  email: z.email('Bitte eine gültige E-Mail-Adresse eingeben.'),
  phone: z.string().trim(),
  street: z.string().trim(),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Bitte eine vierstellige Postleitzahl eingeben.'),
  city: z.string().trim().min(2, 'Bitte den Ort eingeben.'),
});

type FieldErrors = Partial<Record<keyof ContactData | 'unloading' | 'privacy', string>>;

const UNLOADING_OPTIONS: { value: Unloading; title: string; description: string }[] = [
  {
    value: 'FORKLIFT',
    title: 'Stapler vorhanden',
    description: 'Vor Ort gibt es einen Stapler oder Teleskoplader für die Paletten.',
  },
  {
    value: 'CRANE_NEEDED',
    title: 'Kran nötig',
    description: 'Es gibt kein Hebegerät, die Lieferung braucht einen Lkw mit Kran.',
  },
  { value: 'UNKNOWN', title: 'Noch unklar', description: 'Wir klären die Entladung gemeinsam vor dem Angebot.' },
];

export default function KontaktScreen() {
  const router = useRouter();
  const { draft, update, updateContact } = useInquiry();
  const [errors, setErrors] = useState<FieldErrors>({});
  const emailRef = useRef<TextInputInstance>(null);
  const phoneRef = useRef<TextInputInstance>(null);
  const streetRef = useRef<TextInputInstance>(null);
  const postalRef = useRef<TextInputInstance>(null);
  const cityRef = useRef<TextInputInstance>(null);

  const validate = (): boolean => {
    const next: FieldErrors = {};
    const parsed = contactSchema.safeParse({ ...draft.contact, email: draft.contact.email.trim() });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ContactData | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
    }
    if (!draft.unloading) next.unloading = 'Bitte eine Entlademöglichkeit wählen.';
    if (!draft.privacyAccepted) next.privacy = 'Bitte stimmen Sie der Datenschutzerklärung zu.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const next = () => {
    if (!validate()) return;
    router.push('/anfrage/senden');
  };

  const clear = (key: keyof FieldErrors) => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <Screen
      keyboard
      footer={
        <Button
          title="Weiter zur Zusammenfassung"
          onPress={next}
          accessibilityHint="Prüft die Eingaben und zeigt die Zusammenfassung"
        />
      }
    >
      <Stepper steps={WIZARD_STEPS} current={4} />
      <Title>Kontakt und Lieferort</Title>
      <Body>Wohin soll geliefert werden und wie erreichen wir Sie? Felder mit * sind Pflicht.</Body>

      <Input
        label="Name"
        required
        value={draft.contact.customerName}
        onChangeText={(t) => {
          updateContact({ customerName: t });
          clear('customerName');
        }}
        error={errors.customerName}
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <Input
        ref={emailRef}
        label="E-Mail"
        required
        value={draft.contact.email}
        onChangeText={(t) => {
          updateContact({ email: t });
          clear('email');
        }}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
      />
      <Input
        ref={phoneRef}
        label="Telefon"
        value={draft.contact.phone}
        onChangeText={(t) => updateContact({ phone: t })}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        helper="Für Rückfragen, freiwillig."
        returnKeyType="next"
        onSubmitEditing={() => streetRef.current?.focus()}
      />
      <Input
        ref={streetRef}
        label="Straße und Hausnummer"
        value={draft.contact.street}
        onChangeText={(t) => updateContact({ street: t })}
        autoComplete="street-address"
        textContentType="fullStreetAddress"
        returnKeyType="next"
        onSubmitEditing={() => postalRef.current?.focus()}
      />
      <View style={styles.row}>
        <Input
          ref={postalRef}
          label="PLZ"
          required
          value={draft.contact.postalCode}
          onChangeText={(t) => {
            updateContact({ postalCode: t.replace(/[^\d]/g, '').slice(0, 4) });
            clear('postalCode');
          }}
          error={errors.postalCode}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={4}
          autoComplete="postal-code"
          textContentType="postalCode"
          containerStyle={styles.postal}
          returnKeyType="next"
          onSubmitEditing={() => cityRef.current?.focus()}
        />
        <Input
          ref={cityRef}
          label="Ort"
          required
          value={draft.contact.city}
          onChangeText={(t) => {
            updateContact({ city: t });
            clear('city');
          }}
          error={errors.city}
          autoComplete="postal-address-locality"
          textContentType="addressCity"
          containerStyle={styles.city}
          returnKeyType="done"
        />
      </View>

      <Heading>Entladung vor Ort *</Heading>
      {UNLOADING_OPTIONS.map((o) => (
        <SelectCard
          key={o.value}
          title={o.title}
          description={o.description}
          selected={draft.unloading === o.value}
          onPress={() => {
            update({ unloading: o.value });
            clear('unloading');
          }}
        />
      ))}
      {errors.unloading ? <Small color={colors.error}>{errors.unloading}</Small> : null}

      <Input
        label="Anmerkungen"
        value={draft.notes}
        onChangeText={(t) => update({ notes: t })}
        multiline
        numberOfLines={4}
        placeholder="Zeitraum, Besonderheiten vor Ort, Fragen …"
        helper="Freiwillig. Sonderwünsche prüft Mario persönlich."
      />

      <Card style={styles.switchCard}>
        <View style={styles.switchText}>
          <AppText variant="bodyBold">Platten mieten statt kaufen</AppText>
          <Small>Miete ist ein Sonderfall und wird persönlich geprüft.</Small>
        </View>
        <Switch
          value={draft.rentalRequested}
          onValueChange={(v) => update({ rentalRequested: v })}
          trackColor={{ false: colors.border, true: colors.darkGreen }}
          thumbColor={colors.surface}
          accessibilityLabel="Platten mieten statt kaufen"
        />
      </Card>

      <Pressable
        onPress={() => {
          update({ privacyAccepted: !draft.privacyAccepted });
          clear('privacy');
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: draft.privacyAccepted }}
        accessibilityLabel="Ich stimme der Verarbeitung meiner Daten laut Datenschutzerklärung zu"
        style={[styles.checkboxRow, errors.privacy ? styles.checkboxError : null]}
      >
        <View style={[styles.checkbox, draft.privacyAccepted ? styles.checkboxChecked : null]}>
          {draft.privacyAccepted ? (
            <AppText variant="bodyBold" color={colors.sand}>
              ✓
            </AppText>
          ) : null}
        </View>
        <Body style={styles.checkboxLabel}>
          Ich stimme zu, dass meine Angaben zur Bearbeitung der Anfrage verarbeitet werden. *
        </Body>
      </Pressable>
      <Pressable
        onPress={() => Linking.openURL(PRIVACY_URL).catch(() => undefined)}
        accessibilityRole="link"
        style={styles.link}
      >
        <AppText variant="bodyBold" color={colors.terracottaText}>
          Datenschutzerklärung öffnen
        </AppText>
      </Pressable>
      {errors.privacy ? <InfoBanner tone="error" text={errors.privacy} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  postal: { width: 120 },
  city: { flex: 1 },
  switchCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchText: { flex: 1, gap: 2 },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    minHeight: 56,
  },
  checkboxError: { borderWidth: 2, borderColor: colors.error },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.darkGreen },
  checkboxLabel: { flex: 1 },
  link: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md },
});
