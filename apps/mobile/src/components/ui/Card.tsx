import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing } from '@/constants/theme';

interface Props extends ViewProps {
  tone?: 'surface' | 'sage' | 'dark';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ tone = 'surface', padded = true, style, children, ...rest }: Props) {
  return (
    <View
      {...rest}
      style={[
        styles.base,
        tone === 'sage' ? styles.sage : tone === 'dark' ? styles.dark : styles.surface,
        padded ? styles.padded : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.card, overflow: 'hidden' },
  surface: { backgroundColor: colors.surface, ...shadow.card },
  sage: { backgroundColor: colors.sage },
  dark: { backgroundColor: colors.darkGreen },
  padded: { padding: spacing.lg },
});
