import React, { useState } from 'react';
import { View } from 'react-native';
import { Action, Copy } from '../design/components';
import { toHHMM, fromHHMM, display12 } from '../services/time12';

// 12-hour time editor: hour + minute + explicit AM/PM, stored canonically as
// "HH:mm" 24-hour. Replaces raw comma-separated HH:MM entry (B5).
export { toHHMM, fromHHMM, display12 };

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 15, 30, 45];

export default function TimeChips({ times, onChange, label }: {
  times: string[];
  onChange: (times: string[]) => void;
  label?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(30);
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>('PM');
  const sorted = [...times].filter(t => fromHHMM(t)).sort();

  function add() {
    const v = toHHMM(hour, minute, meridiem);
    if (!times.includes(v)) onChange([...sorted, v].sort());
    setAdding(false);
  }

  return <View style={{ gap: 8 }}>
    {!!label && <Copy size="caption" tone="muted">{label}</Copy>}
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {sorted.map(t => (
        <Action secondary key={t} label={`${display12(t)}  ✕`}
          onPress={() => onChange(sorted.filter(x => x !== t))} />
      ))}
      {!adding && <Action secondary label="+ Add time" onPress={() => setAdding(true)} />}
    </View>
    {adding && <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {HOURS.map(h => <Action secondary key={h} label={String(h)} selected={hour === h} onPress={() => setHour(h)} />)}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {MINUTES.map(mn => <Action secondary key={mn} label={`:${String(mn).padStart(2, '0')}`} selected={minute === mn} onPress={() => setMinute(mn)} />)}
        {[5, 10, 20, 25, 35, 40, 50, 55].map(mn => <Action secondary key={mn} label={`:${mn}`} selected={minute === mn} onPress={() => setMinute(mn)} />)}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Action secondary label="AM" selected={meridiem === 'AM'} onPress={() => setMeridiem('AM')} />
        <Action secondary label="PM" selected={meridiem === 'PM'} onPress={() => setMeridiem('PM')} />
        <Action label={`Add ${hour}:${String(minute).padStart(2, '0')} ${meridiem}`} onPress={add} />
      </View>
    </View>}
  </View>;
}
