import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Copy } from '../design/components';
import { useTheme } from '../design/theme';

export default function ScoreRing({ score, size = 72, stroke = 8, label }: {
  score: number | null; size?: number; stroke?: number; label?: string;
}) {
  const { colors } = useTheme();
  const tone = score == null ? colors.muted : score < 40 ? colors.danger : score < 70 ? colors.warning : colors.primary;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = score == null ? 0 : Math.min(1, Math.max(0, score / 100));
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.track} strokeWidth={stroke} fill="none" />
      {fraction > 0 && <Circle cx={size / 2} cy={size / 2} r={radius} stroke={tone} strokeWidth={stroke} fill="none"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - fraction)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />}
    </Svg>
    <Copy size="title" style={{ fontWeight: '700', color: tone }}>{score == null ? '—' : Math.round(score)}</Copy>
    {label && <Copy size="caption" tone="muted">{label}</Copy>}
  </View>;
}
