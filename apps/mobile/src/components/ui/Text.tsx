import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, fonts, fontSizes, lineHeights } from '@/constants/theme';

type Variant = 'title' | 'heading' | 'subheading' | 'body' | 'bodyBold' | 'small' | 'tiny' | 'display';

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

export function AppText({ variant = 'body', color, center, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[styles.base, styles[variant], color ? { color } : null, center ? styles.center : null, style]}
    />
  );
}

export const Title = (p: Props) => <AppText variant="title" accessibilityRole="header" {...p} />;
export const Heading = (p: Props) => <AppText variant="heading" accessibilityRole="header" {...p} />;
export const Subheading = (p: Props) => <AppText variant="subheading" {...p} />;
export const Body = (p: Props) => <AppText variant="body" {...p} />;
export const Small = (p: Props) => <AppText variant="small" {...p} />;

const styles = StyleSheet.create({
  base: { color: colors.text },
  center: { textAlign: 'center' },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.title, lineHeight: lineHeights.title },
  heading: { fontFamily: fonts.heading, fontSize: fontSizes.heading, lineHeight: lineHeights.heading },
  subheading: { fontFamily: fonts.heading, fontSize: fontSizes.subheading, lineHeight: lineHeights.subheading },
  body: { fontFamily: fonts.body, fontSize: fontSizes.body, lineHeight: lineHeights.body },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: fontSizes.body, lineHeight: lineHeights.body },
  small: { fontFamily: fonts.body, fontSize: fontSizes.small, lineHeight: lineHeights.small, color: colors.textMuted },
  tiny: { fontFamily: fonts.body, fontSize: fontSizes.tiny, lineHeight: lineHeights.tiny, color: colors.textMuted },
  display: { fontFamily: fonts.heading, fontSize: fontSizes.display, lineHeight: lineHeights.display },
});
