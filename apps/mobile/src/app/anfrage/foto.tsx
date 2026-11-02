import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Appear } from '@/components/motion/Appear';
import { ScanLine } from '@/components/motion/ScanLine';
import { Screen } from '@/components/Screen';
import { AppText, Body, Button, Card, DisclosureBanner, InfoBanner, Small, Stepper, Title } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useInquiry, WIZARD_STEPS } from '@/context/InquiryContext';
import { api, errorMessage } from '@/lib/api';
import type { PhotoAnalysis, PhotoFile } from '@/lib/types';

const SUITABILITY: Record<PhotoAnalysis['suitability'], { label: string; color: string; background: string }> = {
  GOOD: { label: 'Voraussichtlich gut geeignet', color: colors.success, background: colors.successBackground },
  LIMITED: { label: 'Eingeschränkt geeignet', color: colors.terracottaText, background: colors.warningBackground },
  UNCLEAR: { label: 'Nicht eindeutig erkennbar', color: colors.textMuted, background: colors.sage },
};

function toPhotoFile(asset: ImagePicker.ImagePickerAsset): PhotoFile {
  const type = asset.mimeType ?? 'image/jpeg';
  const extension = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  return {
    uri: asset.uri,
    name: asset.fileName ?? `untergrund-${Date.now()}.${extension}`,
    type,
    width: asset.width,
    height: asset.height,
  };
}

export default function FotoScreen() {
  const router = useRouter();
  const { draft, update } = useInquiry();
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.7,
    exif: false,
  };

  const applyResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.[0]) return;
    update({ photo: toPhotoFile(result.assets[0]), photoAnalysis: undefined });
  };

  const takePhoto = async () => {
    setError(undefined);
    setBusy(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Der Kamera-Zugriff wurde nicht erlaubt. Sie können stattdessen ein Foto aus der Galerie wählen.');
        return;
      }
      applyResult(await ImagePicker.launchCameraAsync(pickerOptions));
    } catch (e) {
      setError(errorMessage(e, 'Die Kamera konnte nicht geöffnet werden.'));
    } finally {
      setBusy(false);
    }
  };

  const pickFromLibrary = async () => {
    setError(undefined);
    setBusy(true);
    try {
      applyResult(await ImagePicker.launchImageLibraryAsync(pickerOptions));
    } catch (e) {
      setError(errorMessage(e, 'Die Galerie konnte nicht geöffnet werden.'));
    } finally {
      setBusy(false);
    }
  };

  const analyze = async () => {
    if (!draft.photo) return;
    setError(undefined);
    setAnalyzing(true);
    try {
      const analysis = await api.analyzePhoto(draft.photo);
      update({ photoAnalysis: analysis });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const removePhoto = () => update({ photo: undefined, photoAnalysis: undefined });

  const analysis = draft.photoAnalysis;
  const footerTitle = analysis ? 'Weiter' : draft.photo ? 'Ohne Analyse weiter' : 'Ohne Foto weiter';

  return (
    <Screen
      footer={
        <Button
          title={footerTitle}
          variant={analysis ? 'primary' : 'secondary'}
          onPress={() => router.push('/anfrage/masse')}
          disabled={analyzing}
          accessibilityHint="Zum nächsten Schritt: Maße"
        />
      }
    >
      <Stepper steps={WIZARD_STEPS} current={1} />
      <Title>Foto vom Untergrund</Title>
      <Body>Ein Foto hilft bei der Einordnung des Bodens. Es ist freiwillig und dient nur der Orientierung.</Body>
      <InfoBanner
        tone="warning"
        text="Bitte keine Personen fotografieren. Zeigen Sie nur den Boden und die Umgebung der geplanten Fläche."
      />

      {draft.photo ? (
        <Card padded={false}>
          <View style={styles.previewWrap}>
            <Image
              source={{ uri: draft.photo.uri }}
              style={styles.preview}
              contentFit="cover"
              accessibilityLabel="Vorschau des gewählten Fotos"
            />
            <ScanLine active={analyzing} />
          </View>
          <View style={styles.previewActions}>
            {analysis ? null : (
              <Button
                title="Analysieren"
                onPress={analyze}
                loading={analyzing}
                accessibilityHint="Sendet das Foto zur KI-Einschätzung"
              />
            )}
            <View style={styles.row}>
              <Button
                title="Anderes Foto"
                variant="outline"
                onPress={pickFromLibrary}
                disabled={busy || analyzing}
                style={styles.half}
              />
              <Button
                title="Entfernen"
                variant="ghost"
                onPress={removePhoto}
                disabled={analyzing}
                style={styles.half}
              />
            </View>
          </View>
        </Card>
      ) : (
        <View style={styles.pickers}>
          <Button title="Foto aufnehmen" onPress={takePhoto} loading={busy} />
          <Button title="Aus Galerie wählen" variant="secondary" onPress={pickFromLibrary} disabled={busy} />
        </View>
      )}

      {analyzing ? (
        <Card tone="sage" style={styles.center}>
          <ActivityIndicator color={colors.darkGreen} size="large" />
          <Body center>Das Foto wird eingeordnet …</Body>
        </Card>
      ) : null}

      {error ? <InfoBanner tone="error" text={error} /> : null}

      {analysis ? (
        <Appear from="up">
          <Card style={styles.analysis}>
            <DisclosureBanner text={analysis.disclosure} />
            <View style={[styles.chip, { backgroundColor: SUITABILITY[analysis.suitability].background }]}>
              <AppText variant="bodyBold" color={SUITABILITY[analysis.suitability].color}>
                {SUITABILITY[analysis.suitability].label}
              </AppText>
            </View>
            <View>
              <Small>Erkannter Untergrund</Small>
              <Body>{analysis.surface}</Body>
            </View>
            <View>
              <Small>Hinweise</Small>
              <Body>{analysis.notes}</Body>
            </View>
            <Small>Sicherheit der Einschätzung: {Math.round(analysis.confidence * 100)} %</Small>
            <InfoBanner
              tone="info"
              title="Nur Orientierung"
              text="Diese Einschätzung ersetzt keine Vermessung und keine Prüfung der Tragfähigkeit vor Ort. Mengen und Preise kommen aus festen Regeln, nicht aus dem Foto."
            />
          </Card>
        </Appear>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  previewWrap: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.sage, overflow: 'hidden' },
  preview: { width: '100%', height: '100%' },
  previewActions: { padding: spacing.md, gap: spacing.sm },
  pickers: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  center: { alignItems: 'center', gap: spacing.md },
  analysis: { gap: spacing.md },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.badge,
  },
});
