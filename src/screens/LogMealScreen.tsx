import React, { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { Action, Card, Copy, Field, IconAction, ListRow, Notice, Sheet } from '../design/components';
import { useTheme } from '../design/theme';
import { useMeals } from '../context/MealsContext';
import { LoggedMeal } from '../storage/meals';
import { loadFavorites, loadRecentFoods, setFavorite } from '../storage/favoriteFoods';
import VoiceInput from '../components/VoiceInput';
import { useFeatureFlags } from '../context/FeatureFlagsContext';

export default function LogMealScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { isEnabled } = useFeatureFlags();
  const { meals, syncError, remove } = useMeals();
  const [recent, setRecent] = useState<LoggedMeal[]>([]);
  const [favorites, setFavorites] = useState<LoggedMeal[]>([]);
  const [tab, setTab] = useState<'today' | 'recent' | 'favorites'>('recent');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [queries, setQueries] = useState({ today: '', recent: '', favorites: '' });
  const offsets = useRef({ today: 0, recent: 0, favorites: 0 });
  const query = queries[tab];
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState(false);
  useFocusEffect(useCallback(() => {
    let live = true;
    setLoading(true);
    Promise.all([loadRecentFoods(), loadFavorites()]).then(([r, f]) => { if (live) {
      const byName = new Map([...r, ...meals].map(meal => [meal.name.trim().toLowerCase(), meal]));
      setRecent([...byName.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20)); setFavorites(f); setError(false);
    } })
      .catch(() => { if (live) setError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // Retry explicitly repeats the focused read without changing its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals, retry]));
  const open = (mode: string) => navigation.navigate('FoodEntry', { mode });
  async function favorite(meal: LoggedMeal, value: boolean) {
    try { setFavorites(await setFavorite(meal, value)); setError(false); } catch { setError(true); }
  }
  const all = tab === 'today' ? meals : tab === 'favorites' ? favorites : recent;
  const needle = query.trim().toLowerCase();
  const rows = needle ? all.filter(m => m.name.toLowerCase().includes(needle)) : all;
  const lists: { value: 'today' | 'recent' | 'favorites'; label: string }[] = [
    { value: 'today', label: 'Today’s diary' }, { value: 'recent', label: 'Recent foods' }, { value: 'favorites', label: 'Favorite foods' }];
  const entries: { icon: keyof typeof Ionicons.glyphMap; label: string; a11y: string; onPress?: () => void; disabled?: boolean }[] = [
    { icon: 'barcode-outline', label: 'Scan', a11y: isEnabled('nutritionLabelScanning') ? 'Scan nutrition label' : 'Label scanning unavailable', onPress: () => navigation.navigate('LabelScanner', { mealType: 'lunch' }), disabled: !isEnabled('nutritionLabelScanning') },
    { icon: 'search', label: 'Search', a11y: 'Search food', onPress: () => open('search') },
    { icon: 'create-outline', label: 'Manual', a11y: 'Manual entry', onPress: () => open('manual') },
    { icon: 'mic-outline', label: 'Voice', a11y: isEnabled('voiceFoodLogging') ? 'Voice log' : 'Voice logging unavailable', onPress: () => setVoiceOpen(true), disabled: !isEnabled('voiceFoodLogging') },
    isEnabled('foodPhotoScanning')
      ? { icon: 'camera-outline', label: 'Photo', a11y: 'Photo or description estimate', onPress: () => open('photo') }
      : { icon: 'camera-outline', label: 'Photo', a11y: 'Photo estimate unavailable', disabled: true }];
  return <KeyboardAwareScrollView key={tab} contentOffset={{ x: 0, y: offsets.current[tab] }}
    onScroll={event => { offsets.current[tab] = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}
    style={{ backgroundColor: colors.background, width: '100%' }} contentContainerStyle={{ padding: 20, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
    {syncError && <Notice title="Saved diary available" message="Meal sync is pending. New entries are saved on this device first." />}
    <VoiceInput open={voiceOpen} onClose={() => setVoiceOpen(false)} onDone={() => setRetry(v => v + 1)} />
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {entries.map(e => <Pressable key={e.label} accessibilityRole="button" accessibilityLabel={e.a11y} accessibilityState={{ disabled: !!e.disabled }}
        disabled={e.disabled} onPress={e.onPress}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 14,
          backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, opacity: e.disabled ? 0.45 : pressed ? 0.7 : 1 })}>
        <Ionicons name={e.icon} size={24} color={colors.primary} />
        <Copy size="caption" style={{ fontWeight: '600' }}>{e.label}</Copy>
      </Pressable>)}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Saved lists" accessibilityHint="Choose which food list to show"
      onPress={() => setPickerOpen(true)}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 14,
        borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 })}>
      <Copy style={{ fontWeight: '600' }}>{lists.find(l => l.value === tab)!.label}</Copy>
      <Ionicons name="chevron-down" size={16} color={colors.muted} />
    </Pressable>
    {pickerOpen && <Sheet visible title="Saved lists" onClose={() => setPickerOpen(false)}>
      {lists.map(l => <Pressable key={l.value} accessibilityRole="button" accessibilityLabel={l.label} accessibilityState={{ selected: tab === l.value }}
        onPress={() => { setTab(l.value); setPickerOpen(false); }}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 14, borderRadius: 12,
          borderWidth: 1, borderColor: tab === l.value ? colors.primary : colors.border, backgroundColor: tab === l.value ? colors.track : 'transparent', opacity: pressed ? 0.7 : 1 })}>
        <Copy style={{ fontWeight: tab === l.value ? '700' : '500', color: tab === l.value ? colors.primary : colors.text }}>{l.label}</Copy>
        {tab === l.value && <Ionicons name="checkmark" size={18} color={colors.primary} />}
      </Pressable>)}
    </Sheet>}
    <Field label="Search this list" placeholder="Filter foods…" value={query} onChangeText={value => setQueries(current => ({ ...current, [tab]: value }))} autoCapitalize="none" returnKeyType="search" />
    <Copy tone="muted" size="caption">Recent foods use the last 30 days saved on this device. Favorites are device-only and included in account export/deletion.</Copy>
    {error && <><Notice error title="Couldn’t load or update saved foods" message="Your available diary is still here. Retry loading saved foods." /><Action secondary label="Retry saved foods" onPress={() => setRetry(value => value + 1)} /></>}
    {loading && tab !== 'today' && <Copy accessibilityLiveRegion="polite">Loading saved foods…</Copy>}
    {!loading && !error && rows.length === 0 && <Card><Notice title={needle ? `No foods match “${query.trim()}”` : tab === 'today' ? 'No meals logged today' : tab === 'recent' ? 'Your recent foods will appear here' : 'No favorites yet'} message={needle ? 'Try a different search term.' : 'Save a meal, then tap the heart on Recent foods.'} /></Card>}
    {rows.length > 0 && <Card style={{ paddingVertical: 4 }}>{rows.map(meal => { const saved = favorites.some(item => item.id === meal.id); return <ListRow key={meal.id}
      title={meal.name}
      subtitle={`${meal.calories} kcal · ${meal.quantityG ? `${meal.quantityG} g` : 'Portion needs review'}`}
      onPress={() => navigation.navigate('FoodEntry', { mode: 'repeat', meal })}>
      <IconAction icon="↻" label={`Repeat ${meal.name}`} onPress={() => navigation.navigate('FoodEntry', { mode: 'repeat', meal })} />
      <IconAction icon={saved ? '♥' : '♡'} label={saved ? `Remove favorite: ${meal.name}` : `Save favorite: ${meal.name}`} onPress={() => { void favorite(meal, !saved); }} />
      {tab === 'today' && <IconAction icon="🗑" danger label={`Remove ${meal.name}`} onPress={() => Alert.alert('Remove meal?', 'This removes the diary entry, not its favorite.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { void remove(meal.id).catch(() => setError(true)); } },
      ])} />}
    </ListRow>; })}</Card>}
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1, minWidth: 0 }}><Action secondary label="Discover recipes" onPress={() => open('recipes')} /></View>
      <View style={{ flex: 1, minWidth: 0 }}><Action secondary label="Food history" onPress={() => navigation.navigate('History')} /></View>
    </View>
  </KeyboardAwareScrollView>;
}
