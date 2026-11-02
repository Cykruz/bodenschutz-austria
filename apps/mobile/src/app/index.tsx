import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ExplainerClip } from '@/components/motion/ExplainerClip';
import { Screen } from '@/components/Screen';
import { AppText, Body, Button, Card, InfoBanner, Small, Title } from '@/components/ui';
import { colors, fonts, spacing } from '@/constants/theme';
import { useInquiry } from '@/context/InquiryContext';
import { api } from '@/lib/api';

const STEPS = [
  {
    title: 'Vorhaben beschreiben',
    text: 'Baustelle, Veranstaltung oder Paddock wählen. Ein Foto kann helfen, geht aber auch ohne.',
  },
  {
    title: 'Maße bestätigen',
    text: 'Fläche in Quadratmetern eingeben. Bei zwei Fahrspuren zählt die Länge der Strecke.',
  },
  {
    title: 'Angebot anfordern',
    text: 'Mengen ansehen, Kontakt und Lieferort ergänzen. Das Angebot folgt nach Prüfung.',
  },
];

export default function StartScreen() {
  const router = useRouter();
  const { draft, reset } = useInquiry();
  const hasDraft = !!draft.projectType;

  return (
    <Screen topInset>
      <Card tone="dark" style={styles.hero}>
        <View style={styles.logoRow}>
          <View style={styles.logo}>
            <AppText variant="subheading" color={colors.sand}>
              BA
            </AppText>
          </View>
          <Small color={colors.accent} style={styles.brand}>
            Bodenschutz Austria
          </Small>
        </View>
        <Title color={colors.sand}>Vom Foto zum Angebot.</Title>
        <Body color={colors.sand}>
          Beschreiben Sie Ihr Vorhaben, wir berechnen Platten und Paletten nach festen Regeln. Das Angebot folgt nach
          persönlicher Prüfung.
        </Body>
      </Card>

      <ExplainerClip />

      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <View key={step.title} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <AppText variant="bodyBold" color={colors.sand}>
                {i + 1}
              </AppText>
            </View>
            <View style={styles.stepText}>
              <AppText variant="bodyBold">{step.title}</AppText>
              <Small>{step.text}</Small>
            </View>
          </View>
        ))}
      </View>

      <Button
        title={hasDraft ? 'Anfrage fortsetzen' : 'Anfrage starten'}
        onPress={() => router.push('/anfrage/vorhaben')}
        accessibilityHint="Öffnet den Anfrage-Assistenten"
      />
      {hasDraft ? <Button title="Entwurf verwerfen und neu starten" variant="ghost" onPress={reset} /> : null}
      <Button title="Fragen an den Berater" variant="secondary" onPress={() => router.push('/chat')} />
      <Button title="So funktioniert es" variant="ghost" onPress={() => router.push('/info')} />

      <InfoBanner
        tone="warning"
        title="Eine Anfrage ist noch keine Bestellung."
        text="Ein Foto ersetzt keine Vermessung und keine Prüfung, ob der Boden tragfähig ist. Verlässliche Preise gibt es erst mit vollständigen, freigegebenen Daten."
      />
      {api.isMock ? (
        <InfoBanner
          tone="info"
          text="Vorschau-Modus: Die App zeigt Beispieldaten, es wird nichts an einen Server gesendet."
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { fontFamily: fonts.bodyBold, letterSpacing: 0.5 },
  steps: { gap: spacing.md, paddingVertical: spacing.sm },
  stepRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1, gap: 2 },
});
