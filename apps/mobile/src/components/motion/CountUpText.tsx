import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, TextInput, type StyleProp, type TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

import { fonts, fontSizes, lineHeights } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface Props {
  value: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
  style?: StyleProp<TextStyle>;
  color?: string;
}

/** Zahlenformat im Worklet (de-AT: Punkt als Tausender, Komma als Dezimal). */
function formatWorklet(value: number, decimals: number): string {
  'worklet';
  const fixed = value.toFixed(decimals);
  const [intPart, fracPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fracPart ? `${grouped},${fracPart}` : grouped;
}

/** Zahl zählt beim Erscheinen hoch (UI-Thread, Text per animatedProps). */
export function CountUpText({ value, decimals = 0, suffix = '', duration = 900, style, color }: Props) {
  const reduceMotion = useReduceMotion();
  const current = useSharedValue(0);
  const finalText = `${formatWorklet(value, decimals)}${suffix}`;

  useEffect(() => {
    if (reduceMotion) {
      current.value = value;
    } else {
      current.value = 0;
      current.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
    }
  }, [current, duration, reduceMotion, value]);

  const animatedProps = useAnimatedProps(() => {
    const text = `${formatWorklet(current.value, decimals)}${suffix}`;
    return { text, defaultValue: text } as { text: string; defaultValue: string };
  });

  if (reduceMotion || Platform.OS === 'web') {
    return <Text style={[styles.text, color ? { color } : null, style]}>{finalText}</Text>;
  }

  return (
    <AnimatedTextInput
      animatedProps={animatedProps}
      editable={false}
      underlineColorAndroid="transparent"
      accessibilityLabel={finalText}
      accessibilityRole="text"
      importantForAccessibility="yes"
      style={[styles.text, styles.input, color ? { color } : null, style]}
    />
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: fonts.heading, fontSize: fontSizes.display, lineHeight: lineHeights.display },
  input: { padding: 0, margin: 0, includeFontPadding: false, textAlignVertical: 'center' },
});
