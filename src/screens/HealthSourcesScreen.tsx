import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Action, Card, Copy, ListRow, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { listProviders, listSources, connectSource, disconnectSource, getDailySummary, getRecovery, Provider, HealthSource, DailyPoint, Recovery } from '../api/healthSources';

const METRIC_LABEL: Record<string, string> = { steps: 'Steps', resting_heart_rate: 'Resting HR', hrv_rmssd: 'HRV (RMSSD)', hrv_sdnn: 'HRV (SDNN)', sleep: 'Sleep', active_energy: 'Active energy', heart_rate: 'Heart rate' };

export default function HealthSourcesScreen() {
  const { colors } = useTheme();
  const { isEnabled } = useFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [sources, setSources] = useState<HealthSource[]>([]);
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [steps, setSteps] = useState<DailyPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [p, s] = await Promise.all([listProviders(), listSources()]);
      setProviders(p); setSources(s);
      if (isEnabled('wearableRecoveryInsightsEnabled')) setRecovery(await getRecovery().catch(() => null));
      setSteps((await getDailySummary('steps', 7).catch(() => ({ summary: [] }))).summary);
    } catch (e: any) { setError(e?.message || 'Could not load'); }
    setLoading(false);
  }, [isEnabled]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const srcFor = (id: string) => sources.find((s) => (typeof s.provider === 'string' ? s.provider : s.provider.id) === id);

  const toggle = async (p: Provider) => {
    const s = srcFor(p.id);
    try {
      if (s && s.connectionState === 'connected') await disconnectSource(p.id);
      else await connectSource(p.id, p.metrics);
      load();
    } catch (e: any) { setError(e?.response?.data?.error || e?.message); }
  };

  if (loading && !providers.length) return <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}><Skeleton /><Skeleton /></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Copy size="heading" style={{ fontWeight: '700' }}>Connected Health</Copy>
      <Copy size="caption" tone="muted">Your health-data providers. Disconnecting keeps your history — deletion is a separate control in Account.</Copy>
      {error ? <Notice error title="Couldn't load" message={error} /> : null}

      <Card>
        {providers.map((p) => {
          const s = srcFor(p.id);
          const connected = s?.connectionState === 'connected';
          const unavailable = p.availability === 'not_available';
          return (
            <ListRow key={p.id}
              title={p.label}
              subtitle={unavailable ? (p.note || 'Coming soon') : connected ? `Connected · last sync ${s?.lastSyncAt ? new Date(s.lastSyncAt).toLocaleDateString() : 'never'}` : s?.connectionState === 'revoked' ? 'Disconnected — history kept' : 'Not connected'}
              children={unavailable ? undefined : <Action label={connected ? 'Disconnect' : 'Connect'} secondary={connected} onPress={() => toggle(p)} />}
            />
          );
        })}
      </Card>

      {steps.length > 0 && (
        <Card>
          <Copy style={{ fontWeight: '600' }}>Steps — last 7 days</Copy>
          {steps.map((d) => (
            <ListRow key={d.day} title={d.day.slice(5)} subtitle={`${d.provider}${d.providersSeen.length > 1 ? ` (deduped from ${d.providersSeen.length} sources)` : ''}`}><Copy>{Math.round(d.value).toLocaleString()}</Copy></ListRow>
          ))}
        </Card>
      )}

      {recovery && recovery.status === 'INSUFFICIENT_DATA' && (
        <Notice tone='muted'>Not enough recorded data yet for recovery trends — {recovery.note}</Notice>
      )}
      {recovery && recovery.status === 'OK' && recovery.trends && (
        <Card>
          <Copy style={{ fontWeight: '600' }}>Recovery trends</Copy>
          {recovery.trends.map((t) => (
            <ListRow key={t.metric} title={METRIC_LABEL[t.metric] || t.metric} subtitle={`${t.direction} — ${t.note}`} />
          ))}
          <Copy size="caption" tone="muted">{recovery.disclaimer}</Copy>
        </Card>
      )}

      {!isEnabled('humaiBandEnabled') && (
        <Copy size="caption" tone="muted">Humai Band is in development — it\'ll appear here when hardware is ready.</Copy>
      )}
    </ScrollView>
  );
}
