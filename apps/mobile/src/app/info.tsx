import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Body, Button, Card, DisclosureBanner, Heading, Small, Title } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { APP_VERSION, PRIVACY_URL, WEB_URL } from '@/lib/config';

const HOW_IT_WORKS = [
  {
    title: 'Vorhaben beschreiben',
    text: 'Baustelle, Veranstaltung oder Paddock auswählen. Ein Foto kann helfen, geht aber auch ohne.',
  },
  {
    title: 'Maße bestätigen',
    text: 'Fläche in Quadratmetern eingeben. Bei zwei Fahrspuren zählt die Länge der Strecke.',
  },
  {
    title: 'Mengen ansehen',
    text: 'Platten und Paletten werden berechnet. Eine kleinere Liefermenge kann als Alternative erscheinen.',
  },
  {
    title: 'Angebot anfordern',
    text: 'Kontakt, Lieferort und Entlademöglichkeit ergänzen. Der Eingang wird bestätigt, das Angebot folgt nach Prüfung.',
  },
];

export default function InfoScreen() {
  const openPrivacy = () => Linking.openURL(PRIVACY_URL).catch(() => undefined);

  return (
    <Screen>
      <Title>So funktioniert es</Title>
      <Body>Vier kurze Schritte von der Idee zum Angebot. Am Ende entscheidet immer ein Mensch.</Body>

      <Card style={styles.card}>
        {HOW_IT_WORKS.map((step, i) => (
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
      </Card>

      <Card tone="sage" style={styles.card}>
        <Heading>Gut zu wissen</Heading>
        <Body>Eine Anfrage ist noch keine Bestellung.</Body>
        <Body>Ein Foto ersetzt keine Vermessung und keine Prüfung, ob der Boden tragfähig ist.</Body>
        <Body>Verlässliche Preise und Versandkosten gibt es erst mit vollständigen, freigegebenen Daten.</Body>
      </Card>

      <Card style={styles.card}>
        <Heading>KI-Hinweis</Heading>
        <DisclosureBanner text="Der Berater-Chat und die Fotoeinschätzung werden von einem KI-System erzeugt und sind als solche gekennzeichnet." />
        <Body>
          Die KI ordnet ein und formuliert. Mengen, Preise und die Einstufung Ihrer Anfrage kommen ausschließlich aus
          festen, vom Betreiber freigegebenen Rechenregeln. Ungeklärte Fälle prüft immer ein Mensch.
        </Body>
      </Card>

      <Card style={styles.card}>
        <Heading>Datenschutz in Kürze</Heading>
        <Body>
          Ihre Angaben (Vorhaben, Maße, Kontakt, Lieferort und auf Wunsch ein Foto) werden nur zur Bearbeitung Ihrer
          Anfrage verwendet und an Bodenschutz Austria übermittelt. Ein Foto wird zur Einordnung des Untergrunds durch
          ein KI-System verarbeitet. Bitte fotografieren Sie keine Personen.
        </Body>
        <Body>
          Ein begonnener Entwurf und der Chat-Verlauf werden nur auf Ihrem Gerät gespeichert, bis Sie sie löschen.
        </Body>
        <Button title="Datenschutzerklärung öffnen" variant="outline" onPress={openPrivacy} />
      </Card>

      <Card tone="sage" style={styles.card}>
        <Heading>Version</Heading>
        <Small>Bodenschutz Austria App {APP_VERSION}</Small>
        <Small>{api.isMock ? 'Vorschau-Modus mit Beispieldaten' : `Server: ${api.baseUrl}`}</Small>
        <Pressable
          onPress={() => Linking.openURL(WEB_URL).catch(() => undefined)}
          accessibilityRole="link"
          style={styles.link}
        >
          <AppText variant="bodyBold" color={colors.terracottaText}>
            bodenschutz-austria.at
          </AppText>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  stepRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1, gap: 2 },
  link: { minHeight: 44, justifyContent: 'center' },
});
