import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, spacing } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

function Dot({ delay, animate }: { delay: number; animate: boolean }) {
  const y = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      y.value = 0;
      return;
    }
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 260, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 360 })
        ),
        -1,
        false
      )
    );
    return () => cancelAnimation(y);
  }, [animate, delay, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** Tipp-Indikator des KI-Beraters: drei Punkte, die nacheinander hüpfen. */
export function TypingDots() {
  const reduceMotion = useReduceMotion();
  return (
    <View style={styles.row} accessibilityLabel="Der Berater schreibt" accessibilityRole="progressbar">
      <Dot delay={0} animate={!reduceMotion} />
      <Dot delay={150} animate={!reduceMotion} />
      <Dot delay={300} animate={!reduceMotion} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, height: 26, paddingHorizontal: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.textGray },
});
