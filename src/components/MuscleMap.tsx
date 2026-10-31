// Stylized front/back muscle map — no image assets, region boxes.
// Highlights involved muscles; never implies intensity or correctness.
import React from 'react';
import { View } from 'react-native';
import { Copy } from '../design/components';
import { useTheme } from '../design/theme';

const FRONT: [string, string][] = [
  ['chest', 'Chest'], ['shoulders', 'Shoulders'], ['biceps', 'Biceps'],
  ['core', 'Core'], ['quads', 'Quads'], ['grip', 'Forearms'],
];
const BACK: [string, string][] = [
  ['posterior', 'Posterior chain'], ['back', 'Back'], ['triceps', 'Triceps'],
  ['glutes', 'Glutes'], ['hamstrings', 'Hamstrings'],
];
const ALL_REGIONS = new Map([...FRONT, ...BACK]);

function Side({ title, regions, involved }: { title: string; regions: [string, string][]; involved: Set<string> }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Copy size="caption" tone="muted" accessibilityRole="header">{title}</Copy>
      {regions.map(([key, label]) => {
        const on = involved.has(key);
        return (
          <View key={key} accessible accessibilityLabel={`${label}: ${on ? 'involved' : 'not involved'}`}
            style={{
              paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1,
              backgroundColor: on ? colors.accent : colors.surface,
              borderColor: on ? colors.primary : colors.border,
            }}>
            <Copy size="caption" tone={on ? 'primary' : 'muted'}>{on ? '● ' : '○ '}{label}</Copy>
          </View>
        );
      })}
    </View>
  );
}

export const MUSCLE_LABELS: Record<string, string> = Object.fromEntries(ALL_REGIONS);

export default function MuscleMap({ muscles }: { muscles: string[] }) {
  const involved = new Set(muscles.map(m => m.toLowerCase()));
  const names = muscles.map(m => ALL_REGIONS.get(m.toLowerCase()) || m).join(', ');
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Side title="Front" regions={FRONT} involved={involved} />
        <Side title="Back" regions={BACK} involved={involved} />
      </View>
      <Copy size="caption" tone="muted">Involves: {names}. A guide to which areas this exercise works — not a measure of effort.</Copy>
    </View>
  );
}
