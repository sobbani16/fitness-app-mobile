import React from 'react';
import { Switch, View } from 'react-native';
import { Copy } from '../design/components';
import { useTheme } from '../design/theme';

/** Labeled switch row with an optional hint under the label. */
export default function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
    <View style={{ flex: 1 }}><Copy>{label}</Copy>{!!hint && <Copy size="caption" tone="muted">{hint}</Copy>}</View>
    <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} accessibilityLabel={label} />
  </View>;
}
