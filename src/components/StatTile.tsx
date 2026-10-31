import React from 'react';
import { View } from 'react-native';
import { Copy } from '../design/components';
import { radius, useTheme } from '../design/theme';

/** Single metric tile — small label over a prominent value, sized for a row of tiles. */
export default function StatTile({ label, value, tone = 'text' }: { label: string; value: string | number; tone?: 'text' | 'muted' | 'primary' | 'danger' }) {
  const { colors } = useTheme();
  return <View accessibilityLabel={`${label}: ${value}`}
    style={{ flex: 1, backgroundColor: colors.background, borderRadius: radius.control, padding: 10, alignItems: 'center', gap: 2 }}>
    <Copy size="caption" tone="muted" style={{ textAlign: 'center' }}>{label}</Copy>
    <Copy tone={tone} style={{ fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{value}</Copy>
  </View>;
}
