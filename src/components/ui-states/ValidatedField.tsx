import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Copy } from '../../design/components';
import { radius, useTheme } from '../../design/theme';

/**
 * Inline error line for any field — slides in under the exact input that
 * failed and announces itself to screen readers. Use for custom controls
 * that don't fit ValidatedField.
 */
export function FormFieldError({ error }: { error?: string | null }) {
  const { colors } = useTheme();
  if (!error) return null;
  return (
    <Animated.View entering={FadeInDown.duration(150)} accessibilityLiveRegion="polite"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text accessibilityElementsHidden style={{ color: colors.danger, fontSize: 13 }}>⚠</Text>
      <Copy size="caption" tone="danger" style={{ flex: 1 }}>{error}</Copy>
    </Animated.View>
  );
}

export interface ValidatedFieldProps extends TextInputProps {
  label: string;
  /** Specific, actionable message — "Enter at least 8 characters", never "Invalid". */
  error?: string | null;
  /** Neutral helper shown until (and only until) there's an error. */
  hint?: string;
  required?: boolean;
}

/**
 * Text field with inline validation: the border and the message flag the
 * exact field the moment the mistake exists, and the copy says how to fix it.
 */
export default function ValidatedField({ label, error, hint, required, style, ...inputProps }: ValidatedFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Copy>
        {label}{required ? ' *' : ''}
      </Copy>
      <TextInput {...inputProps}
        accessibilityLabel={label}
        accessibilityHint={error ? `${error}. ${hint ?? ''}`.trim() : hint}
        placeholderTextColor={colors.muted}
        style={[{ minHeight: 48, borderWidth: 1, borderColor: error ? colors.danger : colors.border,
          borderRadius: radius.control, padding: 12, color: colors.text, backgroundColor: colors.surface, fontSize: 16 }, style]} />
      <FormFieldError error={error} />
      {!error && !!hint && <Copy size="caption" tone="muted">{hint}</Copy>}
    </View>
  );
}
