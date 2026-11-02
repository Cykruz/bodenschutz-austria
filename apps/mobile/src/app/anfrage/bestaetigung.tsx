import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Appear } from '@/components/motion/Appear';
import { Confetti } from '@/components/motion/Confetti';
import { Screen } from '@/components/Screen';
import { AppText, Body, Button, Card, Heading, InfoBanner, Small, Title } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useInquiry } from '@/context/InquiryContext';
import { api, errorMessage } from '@/lib/api';
import { classificationLabel, formatDate, statusDescription, statusLabel } from '@/lib/format';
import type { InquiryPublic } from '@/lib/types';

const PRINCIPLES = [
  'Eine Anfrage ist noch keine Bestellung.',
  'Ein Foto ersetzt keine Vermessung und keine Prüfung der Tragfähigkeit.',
  'Mengen und Preise kommen aus festen Regeln, nicht aus einer Schätzung der KI.',
  'Nichts geht automatisch raus: Ein Mensch prüft und gibt frei.',
];

export default function BestaetigungScreen() {
  const router = useRouter();
  const { lastResult, reset } = useInquiry();
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<{ attempt: number; status?: InquiryPublic; error?: string } | null>(null);

  const id = lastResult?.id;

  useEffect(() => {
    if (!id) return;
    let active = true;
    api
      .getInquiryStatus(id)
      .then((s) => {
        if (active) setOutcome({ attempt, status: s });
      })
      .catch((e: unknown) => {
        if (active) setOutcome({ attempt, error: errorMessage(e) });
      });
    return () => {
      active = false;
    };
  }, [id, attempt]);

  const loadStatus = useCallback(() => setAttempt((a) => a + 1), []);
  const loading = !!id && outcome?.attempt !== attempt;
  const status = outcome?.status;
  const error = !loading ? outcome?.error : undefined;

  const startNew = () => {
    reset();
    router.dismissAll();
    router.push('/anfrage/vorhaben');
  };

  const goHome = () => {
    router.dismissAll();
  };

  if (!lastResult) {
    return (
      <Screen footer={<Button title="Zur Startseite" onPress={goHome} />}>
        <Title>Keine Anfrage gefunden</Title>
        <Body>Es wurde noch keine Anfrage gesendet. Starten Sie den Assistenten auf der Startseite.</Body>
      </Screen>
    );
  }

  const currentStatus = status?.status ?? lastResult.status;

  return (
    <View style={styles.root}>
      <Screen
        footer={
          <View style={styles.footer}>
            <Button title="Neue Anfrage" onPress={startNew} />
            <Button title="Zur Startseite" variant="ghost" onPress={goHome} />
          </View>
        }
      >
        <Appear index={0} from="up">
          <Title>Danke für Ihre Anfrage!</Title>
          <Body>{lastResult.message}</Body>
        </Appear>

        <Appear index={1}>
          <Card tone="dark" style={styles.idCard}>
            <Small color={colors.accent}>Ihre Anfragenummer</Small>
            <AppText variant="heading" color={colors.sand} selectable>
              {lastResult.id}
            </AppText>
            <Small color={colors.sand}>Bitte bei Rückfragen angeben.</Small>
          </Card>
        </Appear>

        <Appear index={2}>
          <Card style={styles.card}>
            <View style={styles.statusHeader}>
              <Heading>Status</Heading>
              {loading ? <ActivityIndicator color={colors.darkGreen} /> : null}
            </View>
            <AppText variant="subheading" color={colors.terracottaText}>
              {statusLabel[currentStatus]}
            </AppText>
            <Body>{statusDescription[currentStatus]}</Body>
            {status ? <Small>Eingegangen am {formatDate(status.createdAt)}</Small> : null}
            {error ? <InfoBanner tone="error" text={error} /> : null}
            <Button title="Status aktualisieren" variant="outline" onPress={loadStatus} disabled={loading} />
          </Card>
        </Appear>

        <Appear index={3}>
          <Card tone="sage" style={styles.card}>
            <Heading>Wie es weitergeht</Heading>
            <Body>{classificationLabel[lastResult.classification]}</Body>
            {lastResult.classification === 'REVIEW' && lastResult.reviewReasons.length > 0 ? (
              <View style={styles.reasons}>
                <Small>Gründe für die persönliche Prüfung:</Small>
                {lastResult.reviewReasons.map((r, i) => (
                  <Body key={i}>• {r}</Body>
                ))}
              </View>
            ) : null}
            <Body>Sie erhalten eine Eingangsbestätigung und das Angebot per E-Mail an die angegebene Adresse.</Body>
          </Card>
        </Appear>

        <Appear index={4}>
          <Card style={styles.card}>
            <Heading>Gut zu wissen</Heading>
            {PRINCIPLES.map((p) => (
              <View key={p} style={styles.bullet}>
                <AppText variant="bodyBold" color={colors.terracotta}>
                  •
                </AppText>
                <Body style={styles.bulletText}>{p}</Body>
              </View>
            ))}
          </Card>
        </Appear>
      </Screen>
      <Confetti />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  footer: { gap: spacing.sm },
  idCard: { gap: spacing.xs },
  card: { gap: spacing.sm },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reasons: { gap: spacing.xs },
  bullet: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bulletText: { flex: 1 },
});
