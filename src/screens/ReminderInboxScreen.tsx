import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Action, Card, Copy, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { actOnInstance, getReminderInstances, ReminderInstance } from '../api/reminders';
import { syncReminderSchedules } from '../services/reminderSync';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Scheduled', sent: 'Sent', ready: 'Ready', suppressed: 'Skipped automatically',
  snoozed: 'Snoozed', completed: 'Done', dismissed: 'Dismissed', skipped: 'Skipped', expired: 'Expired',
};

export default function ReminderInboxScreen() {
  const { colors } = useTheme();
  const [instances, setInstances] = useState<ReminderInstance[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setInstances(await getReminderInstances(40)); setError(''); }
    catch { setError('Could not load reminder history.'); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function act(id: string, action: 'snooze' | 'skip' | 'complete' | 'dismiss') {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await actOnInstance(id, action);
      setInstances(list => (list || []).map(i => (i.id === id ? updated : i)));
      await syncReminderSchedules();
    } catch { setError('Could not update this reminder.'); }
    finally { setBusy(false); }
  }

  if (!instances) return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20 }}><Skeleton label="Loading reminders" /></ScrollView>;

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}
    refreshControl={<RefreshControl refreshing={busy} onRefresh={() => void load()} tintColor={colors.primary} />}>
    <Copy size="title" accessibilityRole="header">Reminder history</Copy>
    {!!error && <Notice title="Please try again" message={error} error />}
    {instances.length === 0 && <Card><Copy tone="muted">No reminders yet. They appear here after they fire or are scheduled.</Copy></Card>}
    {instances.map(i => <Card key={i.id}>
      <Copy>{i.category.replace('meal:', '').replace(/^./, c => c.toUpperCase())} · {STATUS_LABELS[i.status] || i.status}</Copy>
      <Copy size="caption" tone="muted">{new Date(i.scheduledFor).toLocaleString()}{i.reason ? ` — ${i.reason.replace(/_/g, ' ')}` : ''}</Copy>
      {!!i.why && <Copy size="caption" tone="muted">Why: {i.why}</Copy>}
      {['sent', 'ready', 'pending'].includes(i.status) && <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Action secondary label="Done" disabled={busy} onPress={() => void act(i.id, 'complete')} />
        <Action secondary label="Snooze 30" disabled={busy} onPress={() => void act(i.id, 'snooze')} />
        <Action secondary label="Skip" disabled={busy} onPress={() => void act(i.id, 'skip')} />
        <Action secondary label="Dismiss" disabled={busy} onPress={() => void act(i.id, 'dismiss')} />
      </View>}
    </Card>)}
  </ScrollView>;
}
