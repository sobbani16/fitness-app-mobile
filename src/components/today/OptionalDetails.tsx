import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Action, Card, Copy, Field, Notice, Skeleton } from '../../design/components';
import { useTheme } from '../../design/theme';
import type { useWeather } from '../../hooks/useWeather';
import { useSupplementCatalog } from '../../hooks/useSupplementCatalog';
import { useDailyStats } from '../../hooks/useDailyStats';
import { Supplement } from '../../api/supplements';

export function WeatherDetail({ weatherState }: { weatherState: ReturnType<typeof useWeather> }) {
  const { weather, loading, error, permission, savedLocation, connect, setCity, refresh } = weatherState;
  const [city, setCityText] = useState('');
  const [cityMessage, setCityMessage] = useState('');
  const [cityBusy, setCityBusy] = useState(false);
  async function saveCity() {
    if (cityBusy) return;
    setCityBusy(true);
    const result = await setCity(city);
    setCityBusy(false);
    setCityMessage(result === 'saved' ? '' : result === 'not-found' ? 'No matching place found. Try a nearby town or check spelling.' : 'Could not look up that place right now.');
    if (result === 'saved') setCityText('');
  }
  // The compact indicator on Today already shows the forecast, and its edit
  // icon handles the saved-city override — this card only appears when there
  // is no forecast to show (recovery paths).
  if (weather) return null;
  return <Card><Copy size="title">Weather</Copy>
    {loading && <Skeleton label="Loading weather" />}
    {savedLocation && <Copy size="caption" tone="muted">Saved city: {savedLocation.label}.</Copy>}
    {!loading && !weather && permission === 'denied' && <Notice title="Location is off" message="Weather stays off unless you share location again in device settings — or set a city below instead." />}
    {!loading && !weather && permission === 'undetermined' && <Copy tone="muted">Share your location once for a local forecast, or set a city — no device location needed.</Copy>}
    {error && <Copy size="caption" tone="danger">{error}</Copy>}
    {!weather && permission === 'undetermined' && <Action secondary label="Share location for weather" onPress={() => { void connect(); }} />}
    {!weather && permission === 'denied' && <Action secondary label="Retry" onPress={() => { void refresh(); }} />}
    <Field label="Set a city for weather (optional)" value={city} onChangeText={setCityText} placeholder="e.g. Pune" />
    {!!city.trim() && <Action secondary disabled={cityBusy} label={cityBusy ? 'Looking up…' : 'Use this city'} onPress={() => { void saveCity(); }} />}
    {savedLocation && <Action secondary label="Use device location instead" onPress={() => { void setCity(null); }} />}
    {!!cityMessage && <Copy size="caption" tone="danger">{cityMessage}</Copy>}
  </Card>;
}

// Existing non-beta controls retained; this component only mounts when enabled.
export function SupplementsDetail({ daily }: { daily: ReturnType<typeof useDailyStats> }) {
  const { colors } = useTheme();
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
  const iconBtn = (name: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void, danger = false) =>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={busy}
      style={({ pressed }) => ({ minWidth: 40, minHeight: 40, justifyContent: 'center', alignItems: 'center', opacity: busy ? 0.4 : pressed ? 0.6 : 1 })}>
      <Ionicons name={name} size={20} color={danger ? colors.danger : colors.primary} />
    </Pressable>;
  return <Card><Copy size="title">Supplements</Copy>
    {catalog.loading && <Skeleton label="Loading supplements" />}
    {catalog.error && <><Notice error title="Catalog unavailable" message="Saved checklist may be incomplete. Retry when connected." /><Action secondary label="Retry supplement catalog" onPress={catalog.refresh} /></>}
    <Copy size="caption" tone="muted">Checklist on this device · sync is best-effort.</Copy>
    {catalog.mySupplements.length === 0 && <Copy>No supplements selected.</Copy>}
    {catalog.mySupplements.map(s => {
      const taken = Boolean(daily.stats?.supplements[s.name]);
      const qty = quantities[s.id] || 1;
      return <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={`${taken ? 'Taken' : 'Mark taken'}: ${s.name}`}
          accessibilityState={{ checked: taken, disabled: busy }} onPress={() => { void run(() => daily.toggleSupplement(s, qty)); }}
          style={({ pressed }) => ({ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', opacity: busy ? 0.4 : pressed ? 0.6 : 1 })}>
          <Ionicons name={taken ? 'checkbox' : 'square-outline'} size={24} color={taken ? colors.primary : colors.muted} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Copy style={{ fontWeight: '600' }} numberOfLines={1}>{s.name}</Copy>
          <Copy size="caption" tone="muted" numberOfLines={1}>{[s.brand, s.defaultDose].filter(Boolean).join(' · ')}</Copy>
          {taken && <Copy size="caption" tone="muted">{qty} servings · {Math.round((s.calories || 0) * qty)} kcal est. · {Math.round((s.proteinG || 0) * qty)}P · {Math.round((s.carbsG || 0) * qty)}C · {Math.round((s.fatG || 0) * qty)}F g</Copy>}
        </View>
        <View style={{ alignItems: 'center' }}>
          {taken && iconBtn('add', `Increase ${s.name} by half a serving`, () => adjust(s, 0.5))}
          {taken && iconBtn('remove', `Decrease ${s.name} by half a serving`, () => adjust(s, -0.5))}
          {iconBtn('trash-outline', `Remove ${s.name} from checklist`, () => { void run(() => catalog.deselect(s.id)); }, true)}
        </View>
      </View>;
    })}
    <Field label="Search supplement catalog" value={query} onChangeText={value => { setQuery(value); catalog.search(value); }} />
    {catalog.searching && <Skeleton label="Searching supplements" />}
    {catalog.searchResults.filter(s => !catalog.mySupplements.some(m => m.id === s.id)).map(s =>
      <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}><Copy style={{ fontWeight: '600' }} numberOfLines={1}>{s.name}</Copy>
          {!!s.brand && <Copy size="caption" tone="muted" numberOfLines={1}>{s.brand}</Copy>}</View>
        {iconBtn('add-circle-outline', `Add ${s.name}`, () => { void run(() => catalog.select(s)); })}
      </View>)}
    {error && <Notice error title="Unable to update catalog" message="Please try again when connected." />}
  </Card>;
}
