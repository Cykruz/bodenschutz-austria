import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeInLeft, FadeInRight, FadeInUp } from 'react-native-reanimated';

import { useReduceMotion } from '@/lib/motion';

interface Props {
  children: React.ReactNode;
  /** Reihenfolge für gestaffeltes Erscheinen (je 90 ms Versatz). */
  index?: number;
  from?: 'down' | 'up' | 'left' | 'right';
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

const BUILDERS = { down: FadeInDown, up: FadeInUp, left: FadeInLeft, right: FadeInRight } as const;

/** Einmaliges Einblenden mit kleiner Bewegung (opacity + translate). */
export function Appear({ children, index = 0, from = 'down', duration = 360, style }: Props) {
  const reduceMotion = useReduceMotion();
  const entering = reduceMotion ? undefined : BUILDERS[from].duration(duration).delay(index * 90);
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
