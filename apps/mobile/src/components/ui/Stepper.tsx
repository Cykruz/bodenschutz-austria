import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from './Text';
import { colors, radius, spacing } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

interface Props {
  steps: readonly string[];
  current: number; // 0-basiert
}

/** Fortschrittsanzeige „Schritt x von y“ mit animiertem Balken (nur transform). */
export function Stepper({ steps, current }: Props) {
  const total = steps.length;
  const index = Math.min(Math.max(current, 0), total - 1);
  const target = (index + 1) / total;
  const reduceMotion = useReduceMotion();
  // Startet beim vorherigen Stand, damit der Zuwachs sichtbar wird.
  const progress = useSharedValue(reduceMotion ? target : index / total);

  useEffect(() => {
    progress.value = reduceMotion ? target : withTiming(target, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [progress, reduceMotion, target]);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={`Schritt ${index + 1} von ${total}: ${steps[index]}`}
      accessibilityValue={{ min: 0, max: total, now: index + 1 }}
    >
      <View style={styles.row}>
        <AppText variant="small" style={styles.label}>
          Schritt {index + 1} von {total}
        </AppText>
        <AppText variant="small" style={styles.name}>
          {steps[index]}
        </AppText>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { color: colors.textMuted },
  name: { color: colors.darkGreen, fontFamily: 'NunitoSans_700Bold' },
  track: { height: 10, borderRadius: radius.badge, backgroundColor: colors.sage, overflow: 'hidden' },
  fill: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.terracotta,
    borderRadius: radius.badge,
    transformOrigin: 'left',
  },
});
