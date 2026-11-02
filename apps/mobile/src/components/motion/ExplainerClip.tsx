/**
 * Mini-Clip „Vom Foto zum Angebot“ (8 s Schleife, Code statt Video).
 * Eine Zeitachse `t` (0 … 8000 ms) steuert alle Elemente über interpolate;
 * nur transform und opacity werden animiert.
 */
import { useIsFocused } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors, fonts, radius, spacing } from '@/constants/theme';
import { EXPLAINER_LOOP_MS, useReduceMotion } from '@/lib/motion';

const W = 320;
const H = 200;
const END_FRAME = 7600;
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function seg(t: number, from: number, to: number): number {
  'worklet';
  return interpolate(t, [from, to], [0, 1], Extrapolation.CLAMP);
}

/** Eine Platte im Stapel, erscheint zeitversetzt. */
function StackPlate({ t, index }: { t: SharedValue<number>; index: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [3000 + index * 220, 3200 + index * 220], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(t.value, [3000 + index * 220, 3300 + index * 220], [-12, 0], Extrapolation.CLAMP) },
    ],
  }));
  return <Animated.View style={[styles.plate, style]} />;
}

export function ExplainerClip() {
  const reduceMotion = useReduceMotion();
  const focused = useIsFocused();
  const [width, setWidth] = useState(0);
  const [paused, setPaused] = useState(false);
  const t = useSharedValue(reduceMotion ? END_FRAME : 0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(t);
      t.value = END_FRAME;
      return;
    }
    if (!focused || paused) {
      cancelAnimation(t);
      return;
    }
    // Fortsetzen ab aktueller Stelle, danach Endlosschleife.
    const remaining = Math.max(0, EXPLAINER_LOOP_MS - t.value);
    t.value = withTiming(EXPLAINER_LOOP_MS, { duration: remaining, easing: Easing.linear }, (finished) => {
      'worklet';
      if (finished) {
        t.value = 0;
        t.value = withRepeat(
          withTiming(EXPLAINER_LOOP_MS, { duration: EXPLAINER_LOOP_MS, easing: Easing.linear }),
          -1,
          false
        );
      }
    });
    return () => cancelAnimation(t);
  }, [focused, paused, reduceMotion, t]);

  const scale = width > 0 ? width / W : 1;

  // --- Phase 1: Handy und Blitz ---
  const phoneStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 300, 2500, 2900], [0, 1, 1, 0.45], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(t.value, [0, 400], [0.85, 1], Extrapolation.CLAMP) }],
  }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [1100, 1250, 1550], [0, 0.95, 0], Extrapolation.CLAMP),
  }));
  const thumbStyle = useAnimatedStyle(() => {
    const p = seg(t.value, 1500, 2400);
    return {
      opacity: interpolate(t.value, [1500, 1600, 2300, 2450], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(p, [0, 1], [0, 92]) },
        { translateY: interpolate(p, [0, 1], [0, 8]) },
        { rotate: `${interpolate(p, [0, 1], [-8, 4])}deg` },
      ],
    };
  });

  // --- Phase 2: Zahlen ---
  const panelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [2300, 2700, 5300, 5700], [0, 1, 1, 0.45], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(t.value, [2300, 2750], [0.7, 1], Extrapolation.CLAMP) }],
  }));
  const platesProps = useAnimatedProps(() => {
    const value = Math.round(interpolate(t.value, [2800, 4400], [0, 46], Extrapolation.CLAMP));
    return { text: String(value), defaultValue: String(value) } as { text: string; defaultValue: string };
  });
  const palletsProps = useAnimatedProps(() => {
    const value = Math.round(interpolate(t.value, [3600, 4600], [0, 2], Extrapolation.CLAMP));
    return { text: String(value), defaultValue: String(value) } as { text: string; defaultValue: string };
  });
  // --- Phase 3: Umschlag zu Mario ---
  const envelopeStyle = useAnimatedStyle(() => {
    const p = seg(t.value, 5600, 6600);
    const arc = Math.sin(p * Math.PI) * -34;
    return {
      opacity: interpolate(t.value, [5200, 5450, 6750, 6950], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(p, [0, 1], [0, 108]) },
        { translateY: arc + interpolate(t.value, [6600, 6900], [0, 14], Extrapolation.CLAMP) },
        { scale: interpolate(t.value, [5200, 5500], [0.4, 1], Extrapolation.CLAMP) },
        { rotate: `${interpolate(p, [0, 1], [-12, 0])}deg` },
      ],
    };
  });
  const marioStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [5000, 5400], [0.35, 1], Extrapolation.CLAMP),
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [6900, 7100], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(t.value, [6900, 7300], [0.3, 1], Extrapolation.CLAMP) }],
  }));
  const sceneStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 150, 7850, 8000], [0, 1, 1, 0], Extrapolation.CLAMP),
  }));

  // --- Bildunterschriften ---
  const caption1 = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 200, 2300, 2500], [0, 1, 1, 0], Extrapolation.CLAMP),
  }));
  const caption2 = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [2500, 2700, 5000, 5200], [0, 1, 1, 0], Extrapolation.CLAMP),
  }));
  const caption3 = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [5200, 5400, 7800, 8000], [0, 1, 1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View
      style={styles.frame}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityLabel="Erklärschleife: Foto aufnehmen, feste Regeln rechnen Platten und Paletten aus, Umschlag geht an Mario, der prüft und freigibt."
      accessibilityRole="image"
    >
      <View style={{ width: '100%', aspectRatio: W / H }}>
        <Animated.View style={[styles.scene, { transform: [{ scale }] }, sceneStyle]}>
          {/* Handy */}
          <Animated.View style={[styles.abs, { left: 26, top: 30 }, phoneStyle]}>
            <View style={styles.phone}>
              <View style={styles.phoneScreen}>
                <View style={styles.sky} />
                <View style={styles.ground} />
                <View style={styles.grass} />
                <Animated.View style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
              </View>
              <View style={styles.shutter} />
            </View>
          </Animated.View>
          {/* Fliegendes Foto */}
          <Animated.View style={[styles.abs, { left: 40, top: 52 }, thumbStyle]}>
            <View style={styles.thumb}>
              <View style={styles.thumbGround} />
            </View>
          </Animated.View>

          {/* Zahlenkarte */}
          <Animated.View style={[styles.abs, styles.panel, panelStyle]}>
            <Text style={styles.panelLabel}>120 m²</Text>
            <View style={styles.panelRow}>
              <AnimatedTextInput
                animatedProps={platesProps}
                editable={false}
                style={styles.bigNumber}
                underlineColorAndroid="transparent"
              />
              <Text style={styles.panelUnit}>Platten</Text>
            </View>
            <View style={styles.panelRow}>
              <AnimatedTextInput
                animatedProps={palletsProps}
                editable={false}
                style={styles.smallNumber}
                underlineColorAndroid="transparent"
              />
              <Text style={styles.panelUnitSmall}>Paletten</Text>
            </View>
            <View style={styles.stack}>
              <StackPlate t={t} index={2} />
              <StackPlate t={t} index={1} />
              <StackPlate t={t} index={0} />
            </View>
          </Animated.View>

          {/* Mario mit Ablage */}
          <Animated.View style={[styles.abs, { left: 238, top: 26 }, marioStyle]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>M</Text>
            </View>
            <Text style={styles.marioLabel}>Mario</Text>
            <View style={styles.tray} />
          </Animated.View>

          {/* Umschlag */}
          <Animated.View style={[styles.abs, { left: 150, top: 86 }, envelopeStyle]}>
            <Svg width={34} height={24} viewBox="0 0 34 24">
              <Rect
                x={1}
                y={1}
                width={32}
                height={22}
                rx={4}
                fill={colors.sand}
                stroke={colors.darkGreen}
                strokeWidth={2}
              />
              <Path
                d="M2 3 L17 14 L32 3"
                fill="none"
                stroke={colors.darkGreen}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>

          {/* Haken „Freigeben“ */}
          <Animated.View style={[styles.abs, { left: 252, top: 74 }, checkStyle]}>
            <Svg width={40} height={40} viewBox="0 0 40 40">
              <Circle cx={20} cy={20} r={18} fill={colors.success} />
              <Path
                d="M11 21 L17 27 L29 14"
                fill="none"
                stroke={colors.sand}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.checkLabel}>Freigeben</Text>
          </Animated.View>

          {/* Bildunterschriften */}
          <View style={styles.captions} pointerEvents="none">
            <Animated.View style={[styles.caption, caption1]}>
              <View style={styles.captionNumber}>
                <Text style={styles.captionNumberText}>1</Text>
              </View>
              <Text style={styles.captionText}>Foto aufnehmen</Text>
            </Animated.View>
            <Animated.View style={[styles.caption, caption2]}>
              <View style={styles.captionNumber}>
                <Text style={styles.captionNumberText}>2</Text>
              </View>
              <Text style={styles.captionText}>Feste Regeln rechnen</Text>
            </Animated.View>
            <Animated.View style={[styles.caption, caption3]}>
              <View style={styles.captionNumber}>
                <Text style={styles.captionNumberText}>3</Text>
              </View>
              <Text style={styles.captionText}>Mario prüft und gibt frei</Text>
            </Animated.View>
          </View>
        </Animated.View>
      </View>

      {reduceMotion ? (
        <Text style={styles.staticCaption}>
          1 Foto aufnehmen · 2 Feste Regeln rechnen · 3 Mario prüft und gibt frei
        </Text>
      ) : (
        <Pressable
          onPress={() => setPaused((p) => !p)}
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Erklärschleife fortsetzen' : 'Erklärschleife anhalten'}
          style={styles.pauseButton}
          hitSlop={8}
        >
          <Text style={styles.pauseText}>{paused ? '▶' : '❚❚'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: colors.sage, borderRadius: radius.card, overflow: 'hidden' },
  scene: { width: W, height: H, transformOrigin: 'top left' },
  abs: { position: 'absolute' },
  phone: {
    width: 64,
    height: 112,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.darkGreen,
    backgroundColor: colors.sand,
    padding: 5,
    alignItems: 'center',
  },
  phoneScreen: { width: '100%', flex: 1, borderRadius: 6, overflow: 'hidden', backgroundColor: '#CFE3F2' },
  sky: { flex: 1 },
  grass: { height: 10, backgroundColor: '#7FAE6E' },
  ground: { height: 26, backgroundColor: '#B7A98A' },
  flash: { backgroundColor: '#FFFFFF' },
  shutter: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.terracotta, marginTop: 4 },
  thumb: {
    width: 30,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#CFE3F2',
    borderWidth: 2,
    borderColor: colors.sand,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  thumbGround: { height: 9, backgroundColor: '#B7A98A' },
  panel: {
    left: 112,
    top: 40,
    width: 112,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  panelLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textGray },
  panelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bigNumber: {
    fontFamily: fonts.heading,
    fontSize: 30,
    color: colors.darkGreen,
    padding: 0,
    margin: 0,
    minWidth: 40,
    includeFontPadding: false,
  },
  smallNumber: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.terracottaText,
    padding: 0,
    margin: 0,
    minWidth: 16,
    includeFontPadding: false,
  },
  panelUnit: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.darkGreen },
  panelUnitSmall: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.terracottaText },
  stack: { marginTop: 6, gap: 2 },
  plate: { height: 6, borderRadius: 2, backgroundColor: colors.darkGreen, width: 56 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  avatarText: { fontFamily: fonts.heading, fontSize: 18, color: colors.sand },
  marioLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.darkGreen, textAlign: 'center', marginTop: 2 },
  tray: { width: 60, height: 20, borderRadius: 6, backgroundColor: colors.terracotta, marginTop: 24 },
  checkLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.success, textAlign: 'center', marginTop: 2 },
  captions: { position: 'absolute', left: 16, right: 16, bottom: 14, height: 28 },
  caption: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  captionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionNumberText: { fontFamily: fonts.heading, fontSize: 13, color: colors.sand },
  captionText: { fontFamily: fonts.heading, fontSize: 15, color: colors.darkGreen },
  staticCaption: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.darkGreen,
    padding: spacing.md,
    textAlign: 'center',
  },
  pauseButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 58, 47, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseText: { color: colors.sand, fontSize: 12, fontFamily: fonts.heading },
});
