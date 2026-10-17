import React, { useState } from 'react';
import { View } from 'react-native';
import { Action, Card, Copy, Field, Notice, Skeleton } from '../../design/components';
import { useWeather } from '../../hooks/useWeather';
import { useSupplementCatalog } from '../../hooks/useSupplementCatalog';
import { useDailyStats } from '../../hooks/useDailyStats';
import { Supplement } from '../../api/supplements';

export function WeatherDetail() {
  const { weather, loading, error, refresh } = useWeather();
  return <Card><Copy size="title">Local weather</Copy>{loading ? <Skeleton label="Loading weather" /> : weather ?
    <Copy>{weather.description}{weather.tempC !== null ? ` · ${Math.round(weather.tempC)}°C` : ''}</Copy> :
    <Notice title="Weather unavailable" message="Check location access in device settings, then retry." error />}
    {error && <Action label="Retry weather" secondary onPress={refresh} />}</Card>;
}

// Existing non-beta controls retained; this component only mounts when enabled.
export function SupplementsDetail({ daily }: { daily: ReturnType<typeof useDailyStats> }) {
  const catalog = useSupplementCatalog();
  const [query, setQuery] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try { await action(); setError(false); } catch { setError(true); }
    finally { setBusy(false); }
  }
  function adjust(s: Supplement, delta: number) {
    const qty = Math.max(0.5, (quantities[s.id] || 1) + delta);
    setQuantities(prev => ({ ...prev, [s.id]: qty }));
    void run(() => daily.updateSupplementLog(s, qty));
  }
  return <Card><Copy size="title">Supplements</Copy>
    {catalog.loading && <Skeleton label="Loading supplements" />}
    {catalog.error && <><Notice error title="Catalog unavailable" message="Saved checklist may be incomplete. Retry when connected." /><Action secondary label="Retry supplement catalog" onPress={catalog.refresh} /></>}
    <Copy tone="muted">Checklist saved locally. Supplement sync is best-effort; offline retries are not yet guaranteed.</Copy>
    {catalog.mySupplements.length === 0 && <Copy>No supplements selected.</Copy>}
    {catalog.mySupplements.map(s => {
      const taken = Boolean(daily.stats?.supplements[s.name]);
      const qty = quantities[s.id] || 1;
      return <View key={s.id} style={{ gap: 8 }}><Copy style={{ fontWeight: '600' }}>{s.name}</Copy>
        <Copy size="caption" tone="muted">{[s.brand, s.defaultDose].filter(Boolean).join(' · ')}</Copy>
        <Action secondary disabled={busy} label={`${taken ? 'Taken' : 'Mark taken'}: ${s.name}`} onPress={() => { void run(() => daily.toggleSupplement(s, qty)); }} />
        {taken && <><Copy>{qty} servings · {Math.round((s.calories || 0) * qty)} kcal (catalog estimate)</Copy>
          <Copy size="caption" tone="muted">{Math.round((s.proteinG || 0) * qty)} g protein · {Math.round((s.carbsG || 0) * qty)} g carbs · {Math.round((s.fatG || 0) * qty)} g fat</Copy>
          <Action secondary disabled={busy} label={`Decrease ${s.name} by half a serving`} onPress={() => adjust(s, -0.5)} />
          <Action secondary disabled={busy} label={`Increase ${s.name} by half a serving`} onPress={() => adjust(s, 0.5)} /></>}
        <Action secondary disabled={busy} label={`Remove ${s.name} from checklist`} onPress={() => { void run(() => catalog.deselect(s.id)); }} />
      </View>;
    })}
    <Field label="Search supplement catalog" value={query} onChangeText={value => { setQuery(value); catalog.search(value); }} />
    {catalog.searching && <Skeleton label="Searching supplements" />}
    {catalog.searchResults.filter(s => !catalog.mySupplements.some(m => m.id === s.id)).map(s =>
      <Action secondary disabled={busy} key={s.id} label={`Add ${s.name}`} onPress={() => { void run(() => catalog.select(s)); }} />)}
    {error && <Notice error title="Unable to update catalog" message="Please try again when connected." />}
  </Card>;
}
