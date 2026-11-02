import React, { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

const PIECE_COLORS = [colors.terracotta, colors.accent, colors.darkGreen, colors.sage];
const COUNT = 22;
const TOTAL_MS = 2800;

interface PieceSpec {
  left: number; // Prozent
  delay: number;
  duration: number;
  spin: number;
  drift: number;
  color: string;
  width: number;
}

// Einmal beim Laden gewürfelt (nicht während des Renderns), damit jede Bestätigung gleich aussieht.
const PIECES: PieceSpec[] = Array.from({ length: COUNT }, (_, i) => ({
  left: (i / COUNT) * 100 + Math.random() * 4,
  delay: Math.random() * 500,
  duration: 1600 + Math.random() * 900,
  spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360),
  drift: (Math.random() - 0.5) * 80,
  color: PIECE_COLORS[i % PIECE_COLORS.length],
  width: 14 + Math.random() * 10,
}));

function Piece({ spec, fallHeight }: { spec: PieceSpec; fallHeight: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(spec.delay, withTiming(1, { duration: spec.duration, easing: Easing.in(Easing.quad) }));
  }, [progress, spec.delay, spec.duration]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.1, 0.8, 1], [0, 1, 1, 0]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [-40, fallHeight]) },
      { translateX: interpolate(progress.value, [0, 1], [0, spec.drift]) },
      { rotate: `${progress.value * spec.spin}deg` },
      { skewX: '-20deg' },
    ],
  }));

  return (
    <Animated.View
      style={[styles.piece, { left: `${spec.left}%`, backgroundColor: spec.color, width: spec.width }, style]}
    />
  );
}

/** Kurzer Konfettiregen aus Platten-Rauten (nur transform/opacity), läuft einmal. */
export function Confetti() {
  const reduceMotion = useReduceMotion();
  const { height } = useWindowDimensions();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), TOTAL_MS);
    return () => clearTimeout(timer);
  }, []);

  if (reduceMotion || !visible) return null;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {PIECES.map((spec, i) => (
        <Piece key={i} spec={spec} fallHeight={height * 0.8} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0, height: 9, borderRadius: 2 },
});
