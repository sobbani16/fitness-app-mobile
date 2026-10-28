import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Action, Card, Copy, Field, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import * as api from '../api/reminders';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermission, setupNotifications } from '../services/notifications';
import { syncReminderSchedules } from '../services/reminderSync';
import { planNotifications } from '../services/reminderPlan';
import { getLastWaterAt } from '../api/dailyStats';
import { loadMealsFor } from '../storage/meals';

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
  const [diag, setDiag] = useState<{ permission: string; scheduled: { id: string; when: string }[]; planned: number; backend: api.ReminderDiagnostics | null } | null>(null);
  const [testState, setTestState] = useState('');
  const lastTestAt = useRef(0);

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
  async function loadDiagnostics() {
    try {
      const perm = await Notifications.getPermissionsAsync();
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const [lastWaterIso, meals, backend] = await Promise.all([
        getLastWaterAt().catch(() => null),
        loadMealsFor(new Date()).catch(() => [] as { mealType?: string }[]),
        api.getReminderDiagnostics().catch(() => null),
      ]);
      const planned = prefs && categories ? planNotifications(prefs, categories, {
        now: new Date(), lastWaterAt: lastWaterIso ? new Date(lastWaterIso) : null,
        mealsLoggedToday: new Set(meals.map(m => m.mealType).filter(Boolean) as string[]), supplementsEnabled: true,
      }).length : 0;
      setDiag({
        permission: perm.granted ? 'granted' : perm.canAskAgain ? 'not asked/denied (can ask)' : 'denied in Settings',
        scheduled: scheduled.slice(0, 4).map(n => ({ id: n.identifier.replace('humai-reminder:', ''), when: n.trigger && 'date' in n.trigger ? new Date(Number(n.trigger.date)).toLocaleString() : JSON.stringify(n.trigger) })),
        planned,
        backend,
      });
      setError('');
    } catch { setError('Could not load diagnostics.'); }
  }

  // Explicit user-initiated test: one harmless local notification in 5s.
  // Goes through the real delivery path (OS permission + local scheduling),
  // bypassing eligibility/frequency rules for this test only.
  async function sendTestNotification() {
    if (Date.now() - lastTestAt.current < 30000) { setTestState('Wait 30 seconds between test notifications.'); return; }
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) { setTestState('OS permission is off — enable notifications in iPhone Settings first.'); return; }
    lastTestAt.current = Date.now();
    try {
      await setupNotifications();
      await Notifications.scheduleNotificationAsync({
        identifier: 'humai-reminder:test',
        content: { title: 'Humai test notification', body: 'If you can see this, notifications are working.', data: { deepLink: 'Dashboard' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 5000) },
      });
      setTestState('Scheduled — leave this screen; it should arrive in ~5 seconds.');
      void api.sendTestReminder().catch(() => {});
    } catch { setTestState('Could not schedule the test notification.'); }
  }

  function whyZero(c: api.ReminderCategorySetting): string {
    if (!prefs?.masterEnabled) return 'master switch off';
    if (prefs.pausedUntil && new Date(prefs.pausedUntil) > new Date()) return 'paused';
    if (!c.enabled) return 'turned off';
    if (c.source === 'adaptive' && !prefs.adaptiveEnabled) return 'needs adaptive consent';
    if (c.category === 'water') return 'needs a water log to anchor from';
    if (!(c.times || []).length) return 'no times set';
    return 'next times are quiet-hours or already done';
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
      <Copy size="caption" tone="muted">Pause modes (today)</Copy>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {([['vacation', 'Vacation'], ['rest_day', 'Rest day'], ['unwell', 'Feeling unwell'], ['custom', 'Custom']] as const).map(([reason, label]) => (
          <Action secondary key={reason} label={label} selected={prefs.pauseReason === reason}
            onPress={() => void api.pauseReminders(24 * 60, reason).then(p => { setPrefs(p); return syncReminderSchedules(); }).catch(() => setError('Could not pause.'))} />
        ))}
      </View>
      {!!prefs.pausedUntil && <Copy tone="muted">Paused{ prefs.pauseReason ? ` (${prefs.pauseReason.replace('_', ' ')})` : ''} until {new Date(prefs.pausedUntil).toLocaleString()}. Schedules resume automatically.</Copy>}
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
        {c.category === 'supplement' && <>
          <Copy size="caption" tone="muted">Habit stack — only after a confirmed logged meal</Copy>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {([['meal:breakfast', 'After breakfast'], ['meal:lunch', 'After lunch'], ['meal:dinner', 'After dinner']] as const).map(([ev, label]) => (
              <Action secondary key={ev} label={label} selected={c.triggerEvent === ev}
                onPress={() => void saveCategory(c.category, { triggerEvent: c.triggerEvent === ev ? null : ev, triggerDelay: 15 })} />
            ))}
            {!!c.triggerEvent && <Action secondary label="Off" onPress={() => void saveCategory(c.category, { triggerEvent: null })} />}
          </View>
        </>}
        {(c.category === 'water' || c.category === 'meal:snack') && <>
          <Copy size="caption" tone="muted">Habit stack — after a finished workout</Copy>
          <Action secondary label="After workout" selected={c.triggerEvent === 'workout:completed'}
            onPress={() => void saveCategory(c.category, { triggerEvent: c.triggerEvent === 'workout:completed' ? null : 'workout:completed', triggerDelay: 15 })} />
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
      <Copy size="heading">Notification diagnostics</Copy>
      <Action secondary label="Run diagnostics" onPress={() => void loadDiagnostics()} />
      {!!diag && <>
        <Copy>OS permission: {diag.permission}</Copy>
        <Copy>Scheduled on this phone: {diag.scheduled.length ? `${diag.scheduled.length}${diag.scheduled.length >= 4 ? '+' : ''}` : 'none'}</Copy>
        {diag.scheduled.map(s => <Copy key={s.id} size="caption" tone="muted">{s.id} — {s.when}</Copy>)}
        <Copy size="caption" tone="muted">Plan preview (next 14 days): {diag.planned} notification{diag.planned === 1 ? '' : 's'}.</Copy>
        {categories.map(c => <Copy key={c.category} size="caption" tone="muted">{CATEGORY_LABELS[c.category] || c.category}: {c.enabled ? `${(c.times || []).length} time${(c.times || []).length === 1 ? '' : 's'}${c.intervalMinutes ? ` / every ${c.intervalMinutes}m` : ''}` : whyZero(c)}</Copy>)}
        {diag.backend && <>
          <Copy size="caption" tone="muted">Delivery: {diag.backend.delivery}. Registered devices: {diag.backend.devices.length}; push tokens: {diag.backend.devices.filter(d => d.hasPushToken).length}.</Copy>
          {!!diag.backend.recent.length && <Copy size="caption" tone="muted">Recent outcomes: {diag.backend.recent.slice(0, 5).map(r => `${r.category.replace('meal:', '')} ${r.status}${r.reason ? ` (${r.reason})` : ''}`).join(' · ')}</Copy>}
        </>}
      </>}
      {!!testState && <Copy size="caption" tone="muted">{testState}</Copy>}
      <Action label="Send test notification" onPress={() => void sendTestNotification()} />
      <Copy size="caption" tone="muted">Sends one harmless notification to this device in ~5 seconds, through the same path as real reminders. Limited to once per 30 seconds.</Copy>
      <Action secondary label="Save test reminder to inbox" onPress={() => void api.sendTestReminder().then(() => setMessage('Test reminder saved to your inbox.')).catch(() => setError('Could not save test reminder.'))} />
      <Action secondary label="Notification history" onPress={() => navigation.navigate('ReminderInbox')} />
      <Action secondary label="Reset learned patterns" onPress={() => void api.resetLearning().then(() => setMessage('Learned patterns cleared. Your own schedules are unchanged.')).catch(() => setError('Could not reset.'))} />
      <Action secondary label="Turn off adaptive reminders" onPress={() => void api.revokeAdaptive().then(load).then(() => setMessage('Adaptive reminders off. Manual schedules still work.')).catch(() => setError('Could not update.'))} />
    </Card>
  </ScrollView>;
}
