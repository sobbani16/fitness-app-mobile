import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Action, Card, Copy, Field, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import * as api from '../api/reminders';
import { requestNotificationPermission, setupNotifications } from '../services/notifications';
import { syncReminderSchedules } from '../services/reminderSync';

const CATEGORY_LABELS: Record<string, string> = {
  'meal:breakfast': 'Breakfast', 'meal:lunch': 'Lunch', 'meal:dinner': 'Dinner', 'meal:snack': 'Snack',
  water: 'Water', supplement: 'Supplements', workout: 'Workouts', movement: 'Movement breaks',
};

const DAY_OPTIONS = [
  { label: 'Every day', value: null },
  { label: 'Weekdays', value: [1, 2, 3, 4, 5] },
  { label: 'Weekends', value: [0, 6] },
] as const;

function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
    <View style={{ flex: 1 }}><Copy>{label}</Copy>{!!hint && <Copy size="caption" tone="muted">{hint}</Copy>}</View>
    <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} accessibilityLabel={label} />
  </View>;
}

export default function SmartRemindersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const [prefs, setPrefs] = useState<api.ReminderPreferences | null>(null);
  const [categories, setCategories] = useState<api.ReminderCategorySetting[]>([]);
  const [suggestions, setSuggestions] = useState<api.ReminderSuggestion[]>([]);
  const [timesText, setTimesText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, c, s] = await Promise.all([api.getReminderPreferences(), api.getReminderCategories(), api.getSuggestions()]);
      setPrefs(p); setCategories(c); setSuggestions(s);
      setTimesText(Object.fromEntries(c.map(x => [x.category, (x.times || []).join(', ')])));
      setError('');
    } catch { setError('Could not load reminder settings. Check your connection.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void setupNotifications(); void load(); }, [load]);
  useFocusEffect(useCallback(() => { void api.getSuggestions().then(setSuggestions).catch(() => {}); }, []));

  async function savePrefs(patch: Partial<api.ReminderPreferences>) {
    try { setPrefs(await api.updateReminderPreferences(patch)); setError(''); await syncReminderSchedules(); }
    catch (e: any) { setError(e?.response?.data?.error || 'Could not save.'); }
  }
  async function saveCategory(category: string, patch: Partial<api.ReminderCategorySetting>) {
    try {
      const updated = await api.updateReminderCategory(category, patch);
      setCategories(list => list.map(c => (c.category === category ? updated : c)));
      setError(''); await syncReminderSchedules();
    } catch (e: any) { setError(e?.response?.data?.error || 'Could not save.'); }
  }
  function saveTimes(category: string) {
    const times = (timesText[category] || '').split(',').map(t => t.trim()).filter(Boolean);
    void saveCategory(category, { times });
  }
  async function enableMaster(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) setError('Notifications are off in system settings. Reminders need permission; you can still use schedules inside the app.');
    }
    await savePrefs({ masterEnabled: value });
    if (value) setMessage('Reminders on. Pick the categories you want below — nothing sends automatically.');
  }

  if (loading || !prefs) return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20 }}><Skeleton label="Loading reminders" /></ScrollView>;

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
    <Copy size="title" accessibilityRole="header">Smart reminders</Copy>
    {!!error && <Notice title="Please review" message={error} error />}
    {!!message && <Notice title="Done" message={message} />}

    <Card>
      <Toggle label="Enable reminders" value={prefs.masterEnabled} onChange={v => void enableMaster(v)} hint="Master switch. Everything below stays off until you choose it." />
      <Toggle label="Adaptive suggestions" value={prefs.adaptiveEnabled} onChange={v => void savePrefs({ adaptiveEnabled: v })} hint="Separate consent: lets Humai notice your routine and suggest schedule changes. Suggestions never apply themselves." />
      <Toggle label="Stop suggesting schedules" value={prefs.suggestionsMuted} onChange={v => void savePrefs({ suggestionsMuted: v })} hint="No more schedule suggestions until you turn this off." />
      <Toggle label="Weekly digest instead" value={prefs.weeklyDigest} onChange={v => void savePrefs({ weeklyDigest: v })} hint="Prefer one weekly summary over frequent nudges." />
      <Action secondary label={prefs.pausedUntil ? 'Resume reminders' : 'Pause for 1 hour'} onPress={() => void api.pauseReminders(prefs.pausedUntil ? null : 60).then(p => { setPrefs(p); return syncReminderSchedules(); }).catch(() => setError('Could not update pause.'))} />
      {!!prefs.pausedUntil && <Copy tone="muted">Paused until {new Date(prefs.pausedUntil).toLocaleString()}.</Copy>}
    </Card>

    {!!suggestions.length && prefs.adaptiveEnabled && !prefs.suggestionsMuted && <Card>
      <Copy size="heading">Suggestions for you</Copy>
      {suggestions.map(s => <View key={s.id} style={{ gap: 4 }}>
        <Copy>{s.title}</Copy>
        <Copy size="caption" tone="muted">{s.body}</Copy>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Action label="Use this" onPress={() => void api.acceptSuggestion(s.id).then(load).then(syncReminderSchedules).catch(e => setError(e?.response?.data?.error || 'Could not apply.'))} />
          <Action secondary label="Not now" onPress={() => void api.declineSuggestion(s.id).then(load)} />
          <Action secondary label="Stop suggesting" onPress={() => void api.declineSuggestion(s.id, true).then(load)} />
        </View>
      </View>)}
    </Card>}

    <Card>
      <Copy size="heading">Quiet hours & limits</Copy>
      <Field label="Quiet from (HH:MM, optional)" value={prefs.quietStart || ''} placeholder="22:00" onChangeText={v => setPrefs({ ...prefs, quietStart: v })} onBlur={() => void savePrefs({ quietStart: prefs.quietStart || null })} />
      <Field label="Quiet until (HH:MM, optional)" value={prefs.quietEnd || ''} placeholder="07:00" onChangeText={v => setPrefs({ ...prefs, quietEnd: v })} onBlur={() => void savePrefs({ quietEnd: prefs.quietEnd || null })} />
      <Copy>Default snooze</Copy>
      {[15, 30, 60].map(m => <Action secondary key={m} label={`${m} min`} selected={prefs.snoozeMinutes === m} onPress={() => void savePrefs({ snoozeMinutes: m })} />)}
      <Copy>Daily nonessential limit: {prefs.dailyCap}</Copy>
      {[1, 2, 3, 5, 8].map(n => <Action secondary key={n} label={`${n}`} selected={prefs.dailyCap === n} onPress={() => void savePrefs({ dailyCap: n })} />)}
    </Card>

    {categories.map(c => <Card key={c.category}>
      <Toggle label={CATEGORY_LABELS[c.category] || c.category} value={c.enabled} onChange={v => void saveCategory(c.category, { enabled: v })}
        hint={c.source === 'adaptive' ? 'Suggested schedule — you approved this.' : undefined} />
      {!!c.enabled && <>
        {c.category === 'water' ? <>
          <Copy size="caption" tone="muted">Remind when no water is logged for this long.</Copy>
          {[60, 90, 120, 180].map(m => <Action secondary key={m} label={`${m} min`} selected={(c.intervalMinutes ?? 120) === m} onPress={() => void saveCategory(c.category, { intervalMinutes: m })} />)}
        </> : c.category === 'movement' ? <>
          <Copy size="caption" tone="muted">Uses fresh step data only — never guesses. Device validation pending.</Copy>
          {[60, 90, 120].map(m => <Action secondary key={m} label={`${m} min`} selected={(c.intervalMinutes ?? 90) === m} onPress={() => void saveCategory(c.category, { intervalMinutes: m })} />)}
        </> : <>
          <Field label="Times (HH:MM, comma separated)" value={timesText[c.category] || ''} placeholder="12:30" onChangeText={v => setTimesText({ ...timesText, [c.category]: v })} onBlur={() => saveTimes(c.category)} />
          {c.category === 'workout' && <>
            <Copy size="caption" tone="muted">Remind me before it starts</Copy>
            {[15, 30, 60].map(m => <Action secondary key={m} label={`${m} min before`} selected={(c.leadMinutes ?? 30) === m} onPress={() => void saveCategory(c.category, { leadMinutes: m })} />)}
          </>}
        </>}
        <Copy size="caption" tone="muted">Days</Copy>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {DAY_OPTIONS.map(o => <Action secondary key={o.label} label={o.label}
            selected={JSON.stringify(c.daysOfWeek) === JSON.stringify(o.value)}
            onPress={() => void saveCategory(c.category, { daysOfWeek: o.value as unknown as number[] })} />)}
        </View>
      </>}
    </Card>)}

    <Card>
      <Copy size="heading">Tools</Copy>
      <Action secondary label="Send test reminder" onPress={() => void api.sendTestReminder().then(() => setMessage('Test reminder saved to your inbox.')).catch(() => setError('Could not save test reminder.'))} />
      <Action secondary label="Notification history" onPress={() => navigation.navigate('ReminderInbox')} />
      <Action secondary label="Reset learned patterns" onPress={() => void api.resetLearning().then(() => setMessage('Learned patterns cleared. Your own schedules are unchanged.')).catch(() => setError('Could not reset.'))} />
      <Action secondary label="Turn off adaptive reminders" onPress={() => void api.revokeAdaptive().then(load).then(() => setMessage('Adaptive reminders off. Manual schedules still work.')).catch(() => setError('Could not update.'))} />
    </Card>
  </ScrollView>;
}
