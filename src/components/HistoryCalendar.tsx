import React, { useEffect, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Action, Copy } from '../design/components';
import { useTheme } from '../design/theme';
import { ProgressDay } from '../services/progress';
export default function HistoryCalendar({ days, selected, onSelect }: { days: ProgressDay[]; selected: string | null; onSelect: (date: string) => void }) {
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const months = [...new Set(days.map(d => d.date.slice(0, 7)))];
  const [month, setMonth] = useState(months.at(-1) || '');
  const last = months.at(-1);
  useEffect(() => { setMonth(last || ''); }, [last]);
  const index = months.indexOf(month), entries = days.filter(d => d.date.startsWith(month));
  const compact = width - 80 >= 7 * 48 && fontScale <= 1.3;
  const blanks = entries.length ? (new Date(`${entries[0].date}T12:00:00`).getDay() + 6) % 7 : 0;
  return <View style={{ gap: 12 }}>
    <Copy size="heading">{month}</Copy>
    <View style={{ gap: 8 }}><Action secondary label="Previous calendar month" disabled={index <= 0} onPress={() => setMonth(months[index - 1])} /><Action secondary label="Next calendar month" disabled={index >= months.length - 1} onPress={() => setMonth(months[index + 1])} /></View>
    {compact && <View style={{ flexDirection: 'row' }}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <View key={i} style={{ width: '14.2857%', alignItems: 'center' }}><Copy>{d}</Copy></View>)}</View>}
    <View style={{ flexDirection: compact ? 'row' : 'column', flexWrap: 'wrap', gap: compact ? 0 : 8 }}>
      {compact && Array.from({ length: blanks }, (_, i) => <View key={`blank-${i}`} style={{ width: '14.2857%' }} />)}
      {entries.map(day => {
        const meals = day.mealCount > 0, work = (day.workouts ?? 0) > 0;
        const tint = meals && work ? `${colors.primary}2E` : meals || work ? `${colors.warning}33` : `${colors.danger}22`;
        const status = `${day.mealCount} meal records${work ? ', workout logged' : ''}`;
        return <Pressable key={day.date} accessibilityRole="button" accessibilityLabel={`${day.date}: ${status}`} accessibilityState={{ selected: selected === day.date }} onPress={() => onSelect(day.date)}
          style={{ width: compact ? '14.2857%' : '100%', minHeight: 48, padding: 6, borderWidth: 1, borderColor: selected === day.date ? colors.primary : colors.border, borderRadius: 8, backgroundColor: selected === day.date ? colors.accent : tint }}>
          <Copy style={{ textAlign: compact ? 'center' : 'left' }}>{compact ? Number(day.date.slice(8)) : day.date}</Copy>
          <Copy size="caption" tone="muted" style={{ textAlign: compact ? 'center' : 'left' }}>{meals ? `${day.mealCount} ${compact ? 'logs' : 'meals'}` : 'No log'}</Copy>
        </Pressable>; })}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {[[`${colors.primary}2E`, 'Meals + workout'], [`${colors.warning}33`, 'Meals or workout'], [`${colors.danger}22`, 'No records']].map(([bg, label]) => <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: bg, borderWidth: 1, borderColor: colors.border }} /><Copy size="caption" tone="muted">{label}</Copy>
      </View>)}
    </View>
  </View>;
}
