import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './Text';
import { colors, fonts, radius, spacing } from '@/constants/theme';

type Tone = 'info' | 'warning' | 'success' | 'error';

interface Props {
  tone?: Tone;
  title?: string;
  text: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const TONES: Record<Tone, { background: string; accent: string; text: string }> = {
  info: { background: colors.infoBackground, accent: colors.darkGreen, text: colors.text },
  warning: { background: colors.warningBackground, accent: colors.terracotta, text: colors.terracottaText },
  success: { background: colors.successBackground, accent: colors.success, text: colors.success },
  error: { background: colors.errorBackground, accent: colors.error, text: colors.error },
};

export function InfoBanner({ tone = 'info', title, text, style, children }: Props) {
  const palette = TONES[tone];
  return (
    <View
      style={[styles.wrap, { backgroundColor: palette.background, borderLeftColor: palette.accent }, style]}
      accessibilityRole="text"
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'none'}
    >
      {title ? (
        <AppText variant="bodyBold" color={palette.text} style={styles.title}>
          {title}
        </AppText>
      ) : null}
      <AppText variant="small" color={palette.text} style={styles.text}>
        {text}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.input,
    borderLeftWidth: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  title: { fontFamily: fonts.heading },
  text: { lineHeight: 22 },
});
