import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Action, Card, Copy, Field, Notice, Segmented } from '../design/components';
import { useTheme } from '../design/theme';
import * as api from '../api/supplements';
import Toggle from '../components/Toggle';
import TimeChips from '../components/TimeChips';
import { syncReminderSchedules } from '../services/reminderSync';

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' }, { value: 'specific_days', label: 'Specific days' },
  { value: 'weekly', label: 'Weekly' }, { value: 'as_needed', label: 'As needed' },
] as const;

const TIMING = [
  { value: 'FIXED_TIME', label: 'Fixed time' }, { value: 'WITH_BREAKFAST', label: 'With breakfast' },
  { value: 'WITH_LUNCH', label: 'With lunch' }, { value: 'WITH_DINNER', label: 'With dinner' },
  { value: 'AFTER_WORKOUT', label: 'After workout' }, { value: 'BEFORE_BED', label: 'Before bed' },
  { value: 'ANY_TIME', label: 'Any time' },
] as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MEAL_FOR: Record<string, string> = { WITH_BREAKFAST: 'breakfast', WITH_LUNCH: 'lunch', WITH_DINNER: 'dinner' };

export default function SupplementScheduleScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userSupplementId, scheduleId, supplementName } = useRoute<RouteProp<RootStackParamList, 'SupplementSchedule'>>().params;
  const [loading, setLoading] = useState(!!scheduleId);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [frequency, setFrequency] = useState<string>('daily');
  const [days, setDays] = useState<number[]>([]);
  const [timing, setTiming] = useState<string>('FIXED_TIME');
  const [reminderTime, setReminderTime] = useState('08:00');
  const [fallbackTime, setFallbackTime] = useState('09:00');
  const [doseAmount, setDoseAmount] = useState('');
  const [doseUnit, setDoseUnit] = useState('');
  const [notify, setNotify] = useState(true);
  const [sound, setSound] = useState(true);
  const [snooze, setSnooze] = useState(30);
  const [tzPolicy, setTzPolicy] = useState<'FOLLOW_DEVICE' | 'FIXED_TIMEZONE'>('FOLLOW_DEVICE');
  const [existing, setExisting] = useState<api.SupplementSchedule | null>(null);

  useEffect(() => {
    if (!scheduleId) return;
    (async () => {
      try {
        const list = await api.getSchedules(userSupplementId);
        const s = list.find(x => x.id === scheduleId);
        if (s) {
          setExisting(s); setFrequency(s.frequency); setDays(s.daysOfWeek || []);
          setTiming(MEAL_FOR[s.timingRelation] ? s.timingRelation : (s.timingRelation || 'FIXED_TIME'));
          setReminderTime(s.reminderTime || '08:00'); setFallbackTime(s.fallbackTime || '09:00');
          setDoseAmount(s.doseAmount != null ? String(s.doseAmount) : ''); setDoseUnit(s.doseUnit || '');
          setNotify(s.notifyEnabled); setSound(s.soundEnabled); setSnooze(s.snoozeMinutes || 30);
          setTzPolicy((s.timezonePolicy as 'FOLLOW_DEVICE') || 'FOLLOW_DEVICE');
        }
      } catch { setError('Could not load the schedule.'); }
      finally { setLoading(false); }
    })();
  }, [scheduleId, userSupplementId]);

  const needsDays = frequency === 'specific_days';
  const isFixed = timing === 'FIXED_TIME' || timing === 'BEFORE_BED';
  const isMeal = timing.startsWith('WITH_');
  const isWorkout = timing === 'AFTER_WORKOUT';

  const save = useCallback(async () => {
    if (needsDays && !days.length) { setError('Pick at least one day.'); return; }
    setBusy(true); setError('');
    const input: api.ScheduleInput = {
      frequency: frequency === 'daily' ? 'daily' : frequency,
      daysOfWeek: needsDays || frequency === 'weekly' ? days : undefined,
      timingRelation: timing,
      mealAnchor: MEAL_FOR[timing],
      workoutAnchor: isWorkout,
      reminderTime: isFixed || isMeal || isWorkout ? (isFixed ? reminderTime : fallbackTime) : undefined,
      fallbackTime: isFixed ? undefined : fallbackTime,
      doseAmount: doseAmount ? Number(doseAmount) : undefined,
      doseUnit: doseUnit.trim() || undefined,
      notifyEnabled: notify, soundEnabled: sound, snoozeMinutes: snooze,
      timezonePolicy: tzPolicy,
      active: true,
    };
    try {
      if (existing) await api.updateSchedule(existing.id, input);
      else await api.createSchedule(userSupplementId, input);
      await syncReminderSchedules(true);
      navigation.goBack();
    } catch (e: any) { setError(e?.response?.data?.error || 'Could not save the schedule.'); }
    finally { setBusy(false); }
  }, [frequency, days, timing, reminderTime, fallbackTime, doseAmount, doseUnit, notify, sound, snooze, tzPolicy, existing, userSupplementId, navigation, needsDays, isFixed, isMeal, isWorkout]);

  async function remove() {
    if (!existing) return;
    setBusy(true);
    try { await api.deleteSchedule(existing.id); await syncReminderSchedules(true); navigation.goBack(); }
    catch { setError('Could not delete the schedule.'); }
    finally { setBusy(false); }
  }

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
    <Card>
      <Copy size="heading">{existing ? 'Edit schedule' : 'New schedule'}{supplementName ? ` — ${supplementName}` : ''}</Copy>
      {!!error && <Notice error title="Could not save" message={error} />}
      {loading && <Copy tone="muted">Loading…</Copy>}

      <Copy size="caption" tone="muted">How often</Copy>
      <Segmented label="Frequency" options={[...FREQUENCIES]} value={frequency} onChange={setFrequency} />
      {needsDays && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {WEEKDAYS.map((d, i) => <Action key={d} secondary label={d} selected={days.includes(i)} onPress={() => setDays(list => list.includes(i) ? list.filter(x => x !== i) : [...list, i].sort())} />)}
      </View>}

      <Copy size="caption" tone="muted">When to take it</Copy>
      <Segmented label="Timing" options={[...TIMING]} value={timing} onChange={setTiming} />
      <Copy size="caption" tone="muted">{TIMING.find(t => t.value === timing)?.label}</Copy>
      {isFixed && <>
        <Copy size="caption" tone="muted">Reminder time</Copy>
        <TimeChips times={[reminderTime]} onChange={ts => ts[0] && setReminderTime(ts[0])} />
      </>}
      {(isMeal || isWorkout) && <>
        <Copy size="caption" tone="muted">Fallback time — used if no {isMeal ? 'meal is logged' : 'workout happens'}</Copy>
        <TimeChips times={[fallbackTime]} onChange={ts => ts[0] && setFallbackTime(ts[0])} />
      </>}
      {isMeal && <Copy size="caption" tone="muted">Fires when that meal is logged, otherwise at the fallback time.</Copy>}
      {isWorkout && <Copy size="caption" tone="muted">Fires after a logged workout, otherwise at the fallback time.</Copy>}

      <Copy size="caption" tone="muted">Dose (as on your label — not a recommendation)</Copy>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Field label="Amount" value={doseAmount} onChangeText={setDoseAmount} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Unit (g, mg, IU)" value={doseUnit} onChangeText={setDoseUnit} /></View>
      </View>

      <Toggle label="Reminder notification" value={notify} onChange={setNotify} hint={notify ? undefined : 'Doses still appear in your plan without an alert.'} />
      {notify && <Toggle label="Sound" value={sound} onChange={setSound} hint={sound ? 'Audible alert (device silent mode still wins)' : 'Silent notification'} />}
      {notify && <>
        <Copy size="caption" tone="muted">Snooze length</Copy>
        <View style={{ flexDirection: 'row', gap: 8 }}>{[15, 30, 60].map(m => <Action key={m} secondary label={`${m} min`} selected={snooze === m} onPress={() => setSnooze(m)} />)}</View>
      </>}

      <Copy size="caption" tone="muted">When traveling</Copy>
      <Segmented label="Timezone" options={[{ value: 'FOLLOW_DEVICE', label: 'Follow device' }, { value: 'FIXED_TIMEZONE', label: 'Fixed timezone' }]} value={tzPolicy} onChange={v => setTzPolicy(v)} />
      <Copy size="caption" tone="muted">{tzPolicy === 'FOLLOW_DEVICE' ? 'Times follow the device clock — e.g. 8am stays 8am in a new timezone.' : 'Times stay pinned to your home timezone.'}</Copy>

      <Action label={busy ? 'Saving…' : 'Save schedule'} disabled={busy || loading} onPress={() => void save()} />
      {!!existing && <Action secondary label="Delete schedule" disabled={busy} onPress={() => void remove()} />}
    </Card>
  </ScrollView>;
}
