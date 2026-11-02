import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, sizes, spacing } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

interface Props {
  children: React.ReactNode;
  /** Fester Bereich unter dem Scrollinhalt, z. B. Weiter-Button. */
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  keyboard?: boolean;
  /** Oberen Abstand für Bildschirme ohne Kopfzeile ergänzen. */
  topInset?: boolean;
}

/** Einheitlicher Rahmen: Sand-Hintergrund, Scrollbereich, sichere Ränder, optionaler Fußbereich. */
export function Screen({ children, footer, contentStyle, keyboard, topInset }: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const content = (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: (topInset ? insets.top : 0) + spacing.lg,
            paddingBottom: footer ? spacing.lg : insets.bottom + spacing.xl,
          },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Animated.View entering={reduceMotion ? undefined : FadeInRight.duration(280)} style={styles.inner}>
          {children}
        </Animated.View>
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.inner}>{footer}</View>
        </View>
      ) : null}
    </>
  );
  if (keyboard) {
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }
  return <View style={styles.root}>{content}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.md, gap: spacing.md },
  inner: { width: '100%', maxWidth: sizes.maxContentWidth, alignSelf: 'center', gap: spacing.md },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
