import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Action, Card, Copy, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { getHealthSummary, HealthSummary } from '../api/healthData';

const STATUS_LABELS: Record<string, string> = { fresh: 'Up to date', stale: 'Older data', no_data: 'No data yet' };

function MetricCard({ title, status, latest, source, children }: { title: string; status: string; latest: React.ReactNode; source?: string; children?: React.ReactNode }) {
  return <Card>
    <Copy size="heading">{title}</Copy>
    {latest}
    <Copy size="caption" tone="muted">{STATUS_LABELS[status] || status}{source ? ` · Source: ${source}` : ''}</Copy>
    {children}
  </Card>;
}

export default function ConnectedHealthScreen() {
  const { colors } = useTheme();
  const [data, setData] = useState<HealthSummary | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setData(await getHealthSummary(7)); setError(''); }
    catch { setError('Could not load health data. Check your connection.'); }
    finally { setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!data && !error) return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20 }}><Skeleton label="Loading health data" /></ScrollView>;

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}>
    <Copy size="title" accessibilityRole="header">Connected health</Copy>
    {!!error && <Notice title="Unavailable" message={error} error />}
    {!!data && <>
      <Card>
        <Copy size="heading">Sources</Copy>
        {data.sources.length ? data.sources.map(s => <Copy key={s}>{s === 'app' ? 'Humai app (device sensors & logs)' : s} · connected</Copy>)
          : <Copy tone="muted">No sources have synced yet.</Copy>}
        <Copy size="caption" tone="muted">Last successful sync: {new Date(data.syncedAt).toLocaleString()}</Copy>
        <Copy size="caption" tone="muted">Fitbit, Apple Health and Health Connect will appear here when connected.</Copy>
      </Card>
      <MetricCard title="Steps" status={data.steps.status} source={data.steps.latest?.source}
        latest={<Copy>{data.steps.latest ? `${data.steps.latest.value.toLocaleString()} steps · ${data.steps.latest.date}` : 'No steps recorded'}</Copy>} />
      <MetricCard title="Water" status={data.water.status} source={data.water.latest?.source}
        latest={<Copy>{data.water.latest?.totalMlToday != null ? `${data.water.latest.totalMlToday.toLocaleString()} ml today` : 'No water logged'}</Copy>} />
      <MetricCard title="Sleep" status={data.sleep.status} source={data.sleep.latest?.source}
        latest={<Copy>{data.sleep.latest ? `${data.sleep.latest.hours.toFixed(1)} h last night${data.sleep.latest.sleepScore != null ? ` · score ${data.sleep.latest.sleepScore}` : ''}` : 'No sleep recorded'}</Copy>} />
      <MetricCard title="Workouts" status={data.workouts.status} source={data.workouts.latest?.source}
        latest={<Copy>{data.workouts.latest ? `${data.workouts.latest.type} · ${data.workouts.latest.durationMinutes} min` : 'No workouts recorded'}</Copy>}>
        <Copy size="caption" tone="muted">{data.workouts.count} sessions in the last {data.windowDays} days</Copy>
      </MetricCard>
      <Action secondary label="Refresh" onPress={() => { setRefreshing(true); void load(); }} />
    </>}
  </ScrollView>;
}
