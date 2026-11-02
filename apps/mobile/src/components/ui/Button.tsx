import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { colors, fonts, fontSizes, radius, sizes, spacing } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  accessibilityHint,
  testID,
}: Props) {
  const isDisabled = disabled || loading;
  const palette = PALETTE[variant];
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const pressIn = () => {
    if (!reduceMotion) scale.set(withTiming(0.97, { duration: 90 }));
  };
  const pressOut = () => {
    scale.set(withSpring(1, { damping: 14, stiffness: 220 }));
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
        accessibilityLabel={title}
        accessibilityHint={accessibilityHint}
        testID={testID}
        style={({ pressed }) => [
          styles.base,
          { backgroundColor: palette.background, borderColor: palette.border },
          pressed && !isDisabled ? styles.pressed : null,
          isDisabled ? styles.disabled : null,
        ]}
      >
        <View style={styles.content}>
          {loading ? <ActivityIndicator color={palette.text} style={styles.spinner} /> : null}
          <Text style={[styles.label, { color: palette.text }]} numberOfLines={2}>
            {title}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const PALETTE: Record<ButtonVariant, { background: string; text: string; border: string }> = {
  primary: { background: colors.darkGreen, text: colors.textOnDark, border: colors.darkGreen },
  secondary: { background: colors.sage, text: colors.darkGreen, border: colors.sage },
  outline: { background: 'transparent', text: colors.darkGreen, border: colors.darkGreen },
  ghost: { background: 'transparent', text: colors.darkGreen, border: 'transparent' },
  accent: { background: colors.accent, text: colors.darkGreen, border: colors.accent },
};

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.button,
    borderRadius: radius.button,
    borderWidth: 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  spinner: { marginRight: spacing.xs },
  label: { fontFamily: fonts.heading, fontSize: fontSizes.body, textAlign: 'center' },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
});
