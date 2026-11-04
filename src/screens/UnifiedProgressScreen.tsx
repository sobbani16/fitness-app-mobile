import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Copy, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { getUnifiedProgress, UnifiedProgress } from '../api/unifiedProgress';

const LEO_ICON = { celebrate: '🎉', encourage: '💪', steady: '🌱' } as const;

function WeekRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Copy tone="muted" size="caption">{label}</Copy>
      <Copy size="caption">{value}</Copy>
    </View>
  );
}

export default function UnifiedProgressScreen() {
  const { colors } = useTheme();
  const [data, setData] = useState<UnifiedProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(useCallback(() => {
    let live = true;
    setLoading(true); setError(false);
    getUnifiedProgress()
      .then((r) => { if (live) setData(r); })
      .catch(() => { if (live) setError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
      <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Progress</Copy>
      {loading && <Skeleton label="Loading your progress" />}
      {error && <Notice error title="Couldn't load progress" message="Check your connection and try again." />}
      {data && !loading && (
        <>
          <Card>
            <Copy size="heading" style={{ fontWeight: '600' }}>{LEO_ICON[data.leo.state]} Leo says</Copy>
            <Copy>{data.leo.message}</Copy>
          </Card>

          {data.moments.length > 0 && (
            <Card>
              <Copy size="heading" style={{ fontWeight: '600' }}>Moments</Copy>
              {data.moments.map((m) => (
                <View key={m.key} style={{ gap: 2 }}>
                  <Copy style={{ fontWeight: '600' }}>{m.tone === 'celebrate' ? '🏆 ' : m.tone === 'encourage' ? '📈 ' : '· '}{m.title}</Copy>
                  <Copy size="caption" tone="muted">{m.detail}</Copy>
                </View>
              ))}
            </Card>
          )}

          {data.goals && (
            <Card>
              <Copy size="heading" style={{ fontWeight: '600' }}>Shared plan</Copy>
              <Copy>{data.goals.planTitle ?? 'Outcome plan'} — {data.goals.met}/{data.goals.total} goals met{data.goals.open ? `, ${data.goals.open} open` : ''}</Copy>
            </Card>
          )}

          <Card>
            <Copy size="heading" style={{ fontWeight: '600' }}>Last {data.windowWeeks} weeks</Copy>
            <WeekRow label="Workouts" value={data.weekly.map((w) => w.workouts).join(' · ')} />
            <WeekRow label="Days with meals logged" value={data.weekly.map((w) => w.loggedDays).join(' · ')} />
            <WeekRow label="Habit check-ins done" value={data.weekly.map((w) => w.habitsDone).join(' · ')} />
            <WeekRow label="Avg sleep (h)" value={data.weekly.map((w) => w.avgSleepHours ?? '–').join(' · ')} />
            <Copy size="caption" tone="muted">Oldest → this week</Copy>
          </Card>

          {(data.weight.entries > 0 || data.loggingStreakDays != null || data.checkInsSent != null) && (
            <Card>
              <Copy size="heading" style={{ fontWeight: '600' }}>Numbers</Copy>
              {data.weight.entries > 0 && (
                <Copy>Weight: {data.weight.lastKg} kg{data.weight.deltaKg != null ? ` (${data.weight.deltaKg > 0 ? '+' : ''}${data.weight.deltaKg} kg since ${data.weight.since})` : ''}</Copy>
              )}
              {data.loggingStreakDays != null && <Copy>Meal logging streak: {data.loggingStreakDays} days</Copy>}
              {data.checkInsSent != null && <Copy>Coach check-ins sent: {data.checkInsSent}{data.checkInsReviewed != null ? ` (${data.checkInsReviewed} reviewed)` : ''}</Copy>}
            </Card>
          )}
          <Copy size="caption" tone="muted">{data.note}</Copy>
        </>
      )}
    </ScrollView>
  );
}
