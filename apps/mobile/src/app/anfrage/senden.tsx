import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Body, Button, Card, Heading, InfoBanner, Small, Stepper, Title } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useInquiry, WIZARD_STEPS } from '@/context/InquiryContext';
import { api, errorMessage } from '@/lib/api';
import { formatArea, formatNumber, projectTypeLabel, unloadingLabel } from '@/lib/format';
import type { InquiryCreateRequest } from '@/lib/types';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Small style={styles.rowLabel}>{label}</Small>
      <Body style={styles.rowValue}>{value}</Body>
    </View>
  );
}

export default function SendenScreen() {
  const router = useRouter();
  const { draft, setResult, reset } = useInquiry();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const { contact } = draft;
  const complete =
    !!draft.projectType &&
    !!draft.productId &&
    !!draft.unloading &&
    draft.privacyAccepted &&
    (draft.mode === 'AREA' ? !!draft.areaM2 : !!draft.lengthM);

  const send = async () => {
    if (!complete || !draft.projectType || !draft.productId || !draft.unloading) {
      setError('Es fehlen Angaben. Bitte gehen Sie zurück und ergänzen Sie die Pflichtfelder.');
      return;
    }
    setSending(true);
    setError(undefined);
    const body: InquiryCreateRequest = {
      projectType: draft.projectType,
      mode: draft.mode,
      productId: draft.productId,
      customerName: contact.customerName.trim(),
      email: contact.email.trim(),
      postalCode: contact.postalCode.trim(),
      city: contact.city.trim(),
      unloading: draft.unloading,
      rentalRequested: draft.rentalRequested,
      channel: 'APP',
    };
    if (draft.mode === 'AREA') body.areaM2 = draft.areaM2;
    else {
      body.lengthM = draft.lengthM;
      body.laneCount = draft.laneCount;
    }
    if (draft.photoAnalysis?.photoId) body.photoId = draft.photoAnalysis.photoId;
    if (contact.phone.trim()) body.phone = contact.phone.trim();
    if (contact.street.trim()) body.street = contact.street.trim();
    if (draft.notes.trim()) body.notes = draft.notes.trim();

    try {
      const result = await api.createInquiry(body);
      setResult(result);
      reset();
      router.replace('/anfrage/bestaetigung');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const calc = draft.calculation;

  return (
    <Screen
      footer={
        <Button
          title="Anfrage senden"
          onPress={send}
          loading={sending}
          disabled={!complete}
          accessibilityHint="Sendet die unverbindliche Anfrage an Bodenschutz Austria"
        />
      }
    >
      <Stepper steps={WIZARD_STEPS} current={5} />
      <Title>Zusammenfassung</Title>
      <Body>Bitte prüfen Sie Ihre Angaben. Zum Ändern gehen Sie einfach zurück.</Body>

      <Card style={styles.card}>
        <Heading>Vorhaben</Heading>
        <Row label="Art" value={draft.projectType ? projectTypeLabel[draft.projectType] : '–'} />
        <Row
          label="Foto"
          value={
            draft.photoAnalysis
              ? `Analysiert: ${draft.photoAnalysis.surface}`
              : draft.photo
                ? 'Vorhanden, nicht analysiert (wird nicht übertragen)'
                : 'Kein Foto'
          }
        />
        <Row
          label="Maße"
          value={
            draft.mode === 'AREA'
              ? `Fläche ${formatArea(draft.areaM2 ?? 0)}`
              : `${draft.laneCount} Fahrspuren, ${formatNumber(draft.lengthM ?? 0, 1)} m lang`
          }
        />
        <Row label="Produkt" value={draft.product?.name ?? draft.productId ?? '–'} />
      </Card>

      {calc ? (
        <Card tone="sage" style={styles.card}>
          <Heading>Vorläufige Mengen</Heading>
          <View style={styles.numbers}>
            <View>
              <AppText variant="display">{formatNumber(calc.plates)}</AppText>
              <Small>Platten</Small>
            </View>
            <View>
              <AppText variant="display">{formatNumber(calc.pallets)}</AppText>
              <Small>{calc.pallets === 1 ? 'Palette' : 'Paletten'}</Small>
            </View>
          </View>
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Heading>Kontakt und Lieferort</Heading>
        <Row label="Name" value={contact.customerName || '–'} />
        <Row label="E-Mail" value={contact.email || '–'} />
        {contact.phone ? <Row label="Telefon" value={contact.phone} /> : null}
        <Row
          label="Adresse"
          value={[contact.street, `${contact.postalCode} ${contact.city}`].filter(Boolean).join(', ')}
        />
        <Row label="Entladung" value={draft.unloading ? unloadingLabel[draft.unloading] : '–'} />
        <Row label="Miete" value={draft.rentalRequested ? 'Ja, Miete gewünscht' : 'Nein, Kauf'} />
        {draft.notes.trim() ? <Row label="Anmerkungen" value={draft.notes.trim()} /> : null}
      </Card>

      {error ? <InfoBanner tone="error" text={error} /> : null}
      {!complete ? (
        <InfoBanner tone="warning" text="Es fehlen Pflichtangaben. Bitte gehen Sie zurück und ergänzen Sie diese." />
      ) : null}

      <InfoBanner
        tone="info"
        title="Eine Anfrage ist noch keine Bestellung."
        text="Mit dem Senden stellen Sie eine unverbindliche Anfrage. Nichts geht automatisch raus: Ein Mensch prüft Ihre Angaben, bevor ein Angebot entsteht."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: { gap: 2, paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.sage },
  rowLabel: { color: colors.textMuted },
  rowValue: {},
  numbers: { flexDirection: 'row', gap: spacing.xl },
});
