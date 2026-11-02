import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { AppText } from './Text';
import { colors, fonts, fontSizes, radius, sizes, spacing } from '@/constants/theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  helper?: string;
  unit?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<TextInputInstance, Props>(function Input(
  { label, error, helper, unit, required, containerStyle, style, multiline, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.error : focused ? colors.darkGreen : colors.border;
  return (
    <View style={[styles.wrap, containerStyle]}>
      <AppText variant="small" style={styles.label}>
        {label}
        {required ? (
          <AppText variant="small" color={colors.terracottaText}>
            {' '}
            *
          </AppText>
        ) : null}
      </AppText>
      <View style={[styles.field, { borderColor }, multiline ? styles.multiline : null]}>
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          accessibilityLabel={label}
          placeholderTextColor={colors.disabled}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multiline ? styles.inputMultiline : null, style]}
        />
        {unit ? (
          <AppText variant="bodyBold" style={styles.unit}>
            {unit}
          </AppText>
        ) : null}
      </View>
      {error ? (
        <AppText variant="small" color={colors.error} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="small">{helper}</AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { color: colors.text, fontFamily: fonts.bodySemiBold },
  field: {
    minHeight: sizes.input,
    borderWidth: 2,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  multiline: { alignItems: 'flex-start', minHeight: 120, paddingVertical: spacing.sm },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.text,
    paddingVertical: spacing.sm,
    minHeight: sizes.input - 4,
  },
  inputMultiline: { textAlignVertical: 'top', minHeight: 100 },
  unit: { color: colors.textMuted, marginLeft: spacing.sm },
});
