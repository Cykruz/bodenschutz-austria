import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Body, Button, Card, Heading, InfoBanner, Input, SelectCard, Small, Stepper, Title } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useInquiry, WIZARD_STEPS } from '@/context/InquiryContext';
import { api, errorMessage } from '@/lib/api';
import { formatNumber, parseDecimal } from '@/lib/format';
import type { ProductSpec } from '@/lib/types';

const MAX_VALUE = 100_000;

function productDescription(p: ProductSpec): string {
  const parts = [
    `${formatNumber(p.lengthCm)} × ${formatNumber(p.widthCm)} cm, ${formatNumber(p.thicknessMm)} mm stark`,
    `${formatNumber(p.weightKg)} kg je Platte, ${formatNumber(p.platesPerPallet)} Platten je Palette`,
    `Tragfähigkeit bis ${formatNumber(p.loadCapacityTons)} t`,
  ];
  if (p.description) parts.unshift(p.description);
  return parts.join('\n');
}

export default function MasseScreen() {
  const router = useRouter();
  const { draft, update } = useInquiry();

  const [areaText, setAreaText] = useState(draft.areaM2 !== undefined ? String(draft.areaM2).replace('.', ',') : '');
  const [lengthText, setLengthText] = useState(
    draft.lengthM !== undefined ? String(draft.lengthM).replace('.', ',') : ''
  );
  const [touched, setTouched] = useState(false);

  // Laden der Produkte: Ergebnis je Versuch, Ladezustand abgeleitet (kein setState direkt im Effekt).
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<{ attempt: number; products?: ProductSpec[]; error?: string } | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getProducts()
      .then((list) => {
        if (active) setOutcome({ attempt, products: list });
      })
      .catch((e: unknown) => {
        if (active) setOutcome({ attempt, error: errorMessage(e) });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const loadProducts = useCallback(() => setAttempt((a) => a + 1), []);
  const loadingProducts = outcome?.attempt !== attempt;
  const products = outcome?.products ?? null;
  const productsError = !loadingProducts ? outcome?.error : undefined;

  const onAreaChange = (text: string) => {
    setAreaText(text);
    update({ areaM2: parseDecimal(text), calculation: undefined });
  };
  const onLengthChange = (text: string) => {
    setLengthText(text);
    update({ lengthM: parseDecimal(text), calculation: undefined });
  };

  const measure = draft.mode === 'AREA' ? draft.areaM2 : draft.lengthM;
  const measureValid = measure !== undefined && measure > 0 && measure <= MAX_VALUE;
  const measureError =
    touched && !measureValid ? `Bitte einen Wert zwischen 1 und ${formatNumber(MAX_VALUE)} eingeben.` : undefined;
  const canContinue = measureValid && !!draft.productId;

  const next = () => {
    setTouched(true);
    if (!canContinue) return;
    router.push('/anfrage/mengen');
  };

  return (
    <Screen
      keyboard
      footer={
        <Button
          title="Mengen berechnen"
          onPress={next}
          disabled={!canContinue}
          accessibilityHint="Berechnet Platten und Paletten"
        />
      }
    >
      <Stepper steps={WIZARD_STEPS} current={2} />
      <Title>Maße und Produkt</Title>
      <Body>Wie groß ist die Fläche? Bei zwei Fahrspuren reicht die Länge der Strecke.</Body>

      <View style={styles.modeRow}>
        <SelectCard
          title="Fläche"
          description="in Quadratmetern"
          selected={draft.mode === 'AREA'}
          onPress={() => update({ mode: 'AREA', calculation: undefined })}
          style={styles.modeCard}
        />
        <SelectCard
          title="Fahrspuren"
          description="zwei Spuren, Länge in Metern"
          selected={draft.mode === 'LANES'}
          onPress={() => update({ mode: 'LANES', calculation: undefined })}
          style={styles.modeCard}
        />
      </View>

      {draft.mode === 'AREA' ? (
        <Input
          label="Fläche"
          unit="m²"
          required
          value={areaText}
          onChangeText={onAreaChange}
          onBlur={() => setTouched(true)}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="z. B. 120"
          error={measureError}
          helper="Länge mal Breite der Fläche, die abgedeckt werden soll."
          returnKeyType="done"
        />
      ) : (
        <Input
          label="Streckenlänge"
          unit="m"
          required
          value={lengthText}
          onChangeText={onLengthChange}
          onBlur={() => setTouched(true)}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="z. B. 60"
          error={measureError}
          helper="Zwei Fahrspuren, jede so breit wie eine Platte. Die Breite ergibt sich aus dem Produkt."
          returnKeyType="done"
        />
      )}

      <Heading>Welche Platte?</Heading>
      {loadingProducts && !products ? (
        <Card tone="sage" style={styles.loading}>
          <ActivityIndicator color={colors.darkGreen} size="large" />
          <Small>Produkte werden geladen …</Small>
        </Card>
      ) : null}
      {productsError ? (
        <InfoBanner tone="error" text={productsError}>
          <Button title="Erneut laden" variant="outline" onPress={loadProducts} style={styles.retry} />
        </InfoBanner>
      ) : null}
      {products?.length === 0 ? <InfoBanner tone="warning" text="Derzeit sind keine Produkte hinterlegt." /> : null}
      {products?.map((p) => (
        <SelectCard
          key={p.id}
          title={p.name}
          description={productDescription(p)}
          badge={p.isPlaceholder ? 'Platzhalterdaten, werden noch bestätigt' : undefined}
          selected={draft.productId === p.id}
          onPress={() => update({ productId: p.id, product: p, calculation: undefined })}
        />
      ))}
      {products?.some((p) => p.isPlaceholder) ? (
        <Small>
          Maße, Gewichte und Preise sind vorläufige Platzhalter und werden vor dem Angebot vom Betreiber bestätigt.
        </Small>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeCard: { flex: 1, padding: spacing.md },
  loading: { alignItems: 'center', gap: spacing.sm },
  retry: { marginTop: spacing.sm, alignSelf: 'flex-start' },
});
