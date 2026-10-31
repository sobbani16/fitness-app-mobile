import React from 'react';
import { Pressable, View } from 'react-native';
import { Copy } from '../design/components';
import { useTheme } from '../design/theme';

/** Selectable pill. Without `onPress` it renders as a static tag. */
export default function Chip({ label, selected = false, onPress, disabled = false, small = false, checkbox = false, accessibilityLabel, accessibilityRole }: {
  label: string; selected?: boolean; onPress?: () => void; disabled?: boolean; small?: boolean;
  /** Checkbox semantics and a ✓/○ marker for multi-select lists. */
  checkbox?: boolean; accessibilityLabel?: string; accessibilityRole?: 'button' | 'checkbox' | 'radio';
}) {
  const { colors } = useTheme();
  const role = accessibilityRole ?? (checkbox ? 'checkbox' : 'button');
  const style = ({ pressed }: { pressed: boolean }) => ({
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4,
    paddingHorizontal: small ? 10 : 14, paddingVertical: small ? 4 : 8, borderRadius: 20, borderWidth: 1,
    borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.surface,
    opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
  });
  const text = <Copy size="caption" style={{ color: selected ? colors.onPrimary : colors.text, fontWeight: selected ? '700' : '500' }}>
    {checkbox ? `${selected ? '✓' : '○'} ` : ''}{label}</Copy>;
  if (!onPress) return <View accessibilityLabel={accessibilityLabel ?? label} style={style({ pressed: false })}>{text}</View>;
  return <Pressable accessibilityRole={role} accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ checked: role !== 'button' ? selected : undefined, selected: role === 'button' ? selected : undefined, disabled }}
    disabled={disabled} onPress={onPress} style={style}>{text}</Pressable>;
}
