import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

const LINE_HEIGHT = 4;

/** Laufende Scan-Linie über dem Foto, solange die Analyse läuft. */
export function ScanLine({ active }: { active: boolean }) {
  const reduceMotion = useReduceMotion();
  const [height, setHeight] = useState(0);
  const y = useSharedValue(0);

  useEffect(() => {
    if (!active || reduceMotion || height === 0) {
      cancelAnimation(y);
      return;
    }
    y.value = 0;
    y.value = withRepeat(
      withTiming(height - LINE_HEIGHT, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    return () => cancelAnimation(y);
  }, [active, height, reduceMotion, y]);

  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <View style={styles.tint} />
      {reduceMotion ? null : <Animated.View style={[styles.line, lineStyle]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  tint: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(30, 58, 47, 0.25)' },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: LINE_HEIGHT,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
