import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { AppText } from './Text';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

interface Props {
  text: string;
  style?: StyleProp<ViewStyle>;
  /** Abzeichen blinkt einmal beim Erscheinen (z. B. beim Öffnen des Chats). */
  blink?: boolean;
}

/** KI-Kennzeichnung laut EU-KI-Verordnung Art. 50: sichtbares „KI“-Abzeichen plus Hinweistext. */
export function DisclosureBanner({ text, style, blink }: Props) {
  return (
    <View style={[styles.wrap, style]} accessibilityRole="text" accessibilityLabel={`KI-Hinweis: ${text}`}>
      <KiBadge blink={blink} />
      <AppText variant="small" style={styles.text}>
        {text}
      </AppText>
    </View>
  );
}

export function KiBadge({ compact, blink }: { compact?: boolean; blink?: boolean }) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!blink || reduceMotion) return;
    opacity.value = withSequence(
      withTiming(0.25, { duration: 180 }),
      withTiming(1, { duration: 220 }),
      withTiming(0.25, { duration: 180 }),
      withTiming(1, { duration: 220 })
    );
    scale.value = withSequence(withTiming(1.15, { duration: 200 }), withTiming(1, { duration: 300 }));
  }, [blink, opacity, reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[styles.badge, compact ? styles.badgeCompact : null, style]}
      accessibilityLabel="Künstliche Intelligenz"
    >
      <AppText variant="tiny" style={styles.badgeText}>
        KI
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.darkGreen,
    borderRadius: radius.input,
    padding: spacing.md,
  },
  text: { flex: 1, color: colors.textOnDark },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: radius.badge,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 36,
    alignItems: 'center',
  },
  badgeCompact: { paddingHorizontal: 8, paddingVertical: 2, minWidth: 30 },
  badgeText: { color: colors.darkGreen, fontFamily: fonts.heading, letterSpacing: 1 },
});
