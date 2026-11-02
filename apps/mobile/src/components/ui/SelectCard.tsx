import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './Text';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';

interface Props {
  title: string;
  description?: string;
  badge?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** Große auswählbare Karte (Radio-Verhalten). */
export function SelectCard({ title, description, badge, selected, onPress, disabled, style, children }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected, disabled: !!disabled }}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      style={({ pressed }) => [
        styles.card,
        selected ? styles.selected : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.textCol}>
          <AppText variant="subheading" color={selected ? colors.darkGreen : colors.text}>
            {title}
          </AppText>
          {description ? (
            <AppText variant="small" style={styles.description}>
              {description}
            </AppText>
          ) : null}
          {badge ? (
            <View style={styles.badge}>
              <AppText variant="tiny" style={styles.badgeText}>
                {badge}
              </AppText>
            </View>
          ) : null}
          {children}
        </View>
        <View style={[styles.radio, selected ? styles.radioSelected : null]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: spacing.lg,
    minHeight: 88,
    ...shadow.card,
  },
  selected: { borderColor: colors.darkGreen, backgroundColor: colors.sage },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  textCol: { flex: 1, gap: spacing.xs },
  description: { color: colors.textMuted },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warningBackground,
    borderRadius: radius.badge,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },
  badgeText: { color: colors.terracottaText, fontFamily: fonts.bodyBold },
  radio: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  radioSelected: { borderColor: colors.darkGreen },
  radioDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.darkGreen },
});
