import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Appear } from '@/components/motion/Appear';
import { CountUpText } from '@/components/motion/CountUpText';
import { Screen } from '@/components/Screen';
import { AppText, Body, Button, Card, Heading, InfoBanner, Small, Stepper, Title } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useInquiry, WIZARD_STEPS } from '@/context/InquiryContext';
import { api, errorMessage } from '@/lib/api';
import { formatArea, formatEuroFromCents, formatNumber } from '@/lib/format';
import type { CalculateRequest } from '@/lib/types';

export default function MengenScreen() {
  const router = useRouter();
  const { draft, update } = useInquiry();
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<{ key: string; error?: string } | null>(null);

  const { projectType, mode, areaM2, lengthM, laneCount, productId } = draft;
  const postalCode = draft.contact.postalCode;

  const request = useMemo<CalculateRequest | null>(() => {
    if (!projectType || !productId) return null;
    if (mode === 'AREA' && !areaM2) return null;
    if (mode === 'LANES' && !lengthM) return null;
    const base: CalculateRequest = { projectType, mode, productId };
    if (mode === 'AREA') base.areaM2 = areaM2;
    else {
      base.lengthM = lengthM;
      base.laneCount = laneCount;
    }
    if (/^\d{4}$/.test(postalCode)) base.postalCode = postalCode;
    return base;
  }, [projectType, mode, areaM2, lengthM, laneCount, productId, postalCode]);

  // Schlüssel je Anfrage und Versuch: Ladezustand wird abgeleitet statt im Effekt gesetzt.
  const requestKey = request ? `${attempt}:${JSON.stringify(request)}` : null;

  useEffect(() => {
    if (!request || !requestKey) return;
    let active = true;
    api
      .calculate(request)
      .then((result) => {
        if (!active) return;
        update({ calculation: result });
        setOutcome({ key: requestKey });
      })
      .catch((e: unknown) => {
        if (active) setOutcome({ key: requestKey, error: errorMessage(e) });
      });
    return () => {
      active = false;
    };
  }, [request, requestKey, update]);

  const run = useCallback(() => setAttempt((a) => a + 1), []);
  const loading = !!requestKey && outcome?.key !== requestKey;
  const error = !loading && outcome?.key === requestKey ? outcome.error : undefined;

  const calc = draft.calculation;
  const pricing = calc?.pricing;
  const showPrice = !!pricing && pricing.totalCents > 0;

  return (
    <Screen
      footer={
        <Button
          title="Weiter zum Kontakt"
          disabled={!calc || loading}
          onPress={() => router.push('/anfrage/kontakt')}
          accessibilityHint="Zum nächsten Schritt: Kontaktdaten"
        />
      }
    >
      <Stepper steps={WIZARD_STEPS} current={3} />
      <Title>Ihre Mengen</Title>
      <Body>Berechnet nach den festen Regeln des Betreibers, nicht geschätzt. Alle Werte sind vorläufig.</Body>

      {!request ? (
        <InfoBanner
          tone="warning"
          text="Es fehlen Angaben. Bitte gehen Sie zurück und ergänzen Sie Vorhaben, Maße und Produkt."
        >
          <Button
            title="Zurück zu den Maßen"
            variant="outline"
            onPress={() => router.back()}
            style={styles.inlineButton}
          />
        </InfoBanner>
      ) : null}

      {loading ? (
        <Card tone="sage" style={styles.center}>
          <ActivityIndicator color={colors.darkGreen} size="large" />
          <Body center>Mengen werden berechnet …</Body>
        </Card>
      ) : null}

      {error ? (
        <InfoBanner tone="error" text={error}>
          <Button title="Erneut berechnen" variant="outline" onPress={run} style={styles.inlineButton} />
        </InfoBanner>
      ) : null}

      {calc && !loading ? (
        <>
          <Appear index={0}>
            <Card tone="dark" style={styles.resultCard}>
              <Small color={colors.accent}>{draft.product?.name ?? 'Gewählte Platte'}</Small>
              <View style={styles.bigRow}>
                <View style={styles.bigCell}>
                  <CountUpText value={calc.plates} color={colors.sand} />
                  <Body color={colors.sand}>Platten</Body>
                </View>
                <View style={styles.bigCell}>
                  <CountUpText value={calc.pallets} color={colors.sand} duration={1100} />
                  <Body color={colors.sand}>{calc.pallets === 1 ? 'Palette' : 'Paletten'}</Body>
                </View>
              </View>
              <View style={styles.metaRow}>
                <Small color={colors.sand}>Fläche: {formatArea(calc.areaM2)}</Small>
                <View style={styles.weightRow}>
                  <Small color={colors.sand}>Gewicht: </Small>
                  {calc.weightKg >= 1000 ? (
                    <CountUpText
                      value={calc.weightKg / 1000}
                      decimals={1}
                      suffix=" t"
                      color={colors.sand}
                      style={styles.weightText}
                    />
                  ) : (
                    <CountUpText value={calc.weightKg} suffix=" kg" color={colors.sand} style={styles.weightText} />
                  )}
                </View>
              </View>
            </Card>
          </Appear>

          {calc.alternative ? (
            <Appear index={1}>
              <Card tone="sage" style={styles.gap}>
                <Heading>Alternative mit weniger Paletten</Heading>
                <Body>
                  {formatNumber(calc.alternative.pallets)} {calc.alternative.pallets === 1 ? 'Palette' : 'Paletten'} mit{' '}
                  {formatNumber(calc.alternative.plates)} Platten decken etwa{' '}
                  {formatArea(calc.alternative.coveredAreaM2)} ab.
                </Body>
                <Small>{calc.alternative.note}</Small>
              </Card>
            </Appear>
          ) : null}

          <Appear index={2}>
            <Card style={styles.gap}>
              <Heading>Preis</Heading>
              {showPrice ? (
                <>
                  <View style={styles.priceRow}>
                    <Body>Platten</Body>
                    <Body>{formatEuroFromCents(pricing.platesCents)}</Body>
                  </View>
                  <View style={styles.priceRow}>
                    <Body>Fracht{pricing.freightZone ? ` (${pricing.freightZone})` : ''}</Body>
                    <Body>
                      {pricing.freightCents > 0 ? formatEuroFromCents(pricing.freightCents) : 'folgt nach PLZ'}
                    </Body>
                  </View>
                  <View style={[styles.priceRow, styles.totalRow]}>
                    <AppText variant="bodyBold">Vorläufig gesamt</AppText>
                    <AppText variant="heading" color={colors.terracottaText}>
                      {formatEuroFromCents(pricing.totalCents)}
                    </AppText>
                  </View>
                  <InfoBanner
                    tone="warning"
                    text={
                      pricing.hasPlaceholderData
                        ? 'Vorläufiger Richtwert auf Basis von Platzhalterdaten. Verbindlich wird der Preis erst mit dem geprüften Angebot.'
                        : 'Vorläufiger Richtwert. Verbindlich wird der Preis erst mit dem geprüften Angebot.'
                    }
                  />
                </>
              ) : (
                <Body>Preis folgt nach Prüfung. Sie erhalten das Angebot nach persönlicher Kontrolle per E-Mail.</Body>
              )}
            </Card>
          </Appear>

          <Appear index={3}>
            <Card style={styles.gap}>
              <Pressable
                onPress={() => setShowAssumptions((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: showAssumptions }}
                style={styles.assumptionsHeader}
              >
                <Heading>Annahmen</Heading>
                <AppText variant="bodyBold" color={colors.terracottaText}>
                  {showAssumptions ? 'Ausblenden' : 'Anzeigen'}
                </AppText>
              </Pressable>
              {showAssumptions ? (
                <View style={styles.gap}>
                  {calc.assumptions.length === 0 ? <Small>Keine besonderen Annahmen.</Small> : null}
                  {calc.assumptions.map((a, i) => (
                    <View key={i} style={styles.bullet}>
                      <AppText variant="bodyBold" color={colors.terracotta}>
                        •
                      </AppText>
                      <Body style={styles.bulletText}>{a}</Body>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          </Appear>

          <Appear index={4}>
            <InfoBanner
              tone="info"
              title="Eine Anfrage ist noch keine Bestellung."
              text="Die Mengen sind eine Grundlage für das Angebot. Verlässliche Preise und Versandkosten gibt es erst mit vollständigen, freigegebenen Daten."
            />
          </Appear>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.md },
  inlineButton: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  resultCard: { gap: spacing.md },
  bigRow: { flexDirection: 'row', gap: spacing.md },
  bigCell: { flex: 1, alignItems: 'flex-start' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  weightRow: { flexDirection: 'row', alignItems: 'center' },
  weightText: { fontFamily: 'NunitoSans_400Regular', fontSize: 15, lineHeight: 21 },
  gap: { gap: spacing.sm },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs },
  assumptionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48 },
  bullet: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bulletText: { flex: 1 },
});
