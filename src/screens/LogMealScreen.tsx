import React, { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { Action, Card, Copy, Field, IconAction, ListRow, Notice } from '../design/components';
import { useTheme } from '../design/theme';
import { useMeals } from '../context/MealsContext';
import { LoggedMeal } from '../storage/meals';
import { loadFavorites, loadRecentFoods, setFavorite } from '../storage/favoriteFoods';
import { betaFeatures } from '../config/betaFeatures';

export default function LogMealScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { meals, syncError, remove } = useMeals();
  const [recent, setRecent] = useState<LoggedMeal[]>([]);
  const [favorites, setFavorites] = useState<LoggedMeal[]>([]);
  const [tab, setTab] = useState<'today' | 'recent' | 'favorites'>('recent');
  const [query, setQuery] = useState('');
  const [error, setError] = useState(false);
  useFocusEffect(useCallback(() => {
    let live = true;
    Promise.all([loadRecentFoods(), loadFavorites()]).then(([r, f]) => { if (live) {
      const byName = new Map([...r, ...meals].map(meal => [meal.name.trim().toLowerCase(), meal]));
      setRecent([...byName.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20)); setFavorites(f); setError(false);
    } })
      .catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [meals]));
  const open = (mode: string) => navigation.navigate('FoodEntry', { mode });
  async function favorite(meal: LoggedMeal, value: boolean) {
    try { setFavorites(await setFavorite(meal, value)); setError(false); } catch { setError(true); }
  }
  const all = tab === 'today' ? meals : tab === 'favorites' ? favorites : recent;
  const needle = query.trim().toLowerCase();
  const rows = needle ? all.filter(m => m.name.toLowerCase().includes(needle)) : all;
  return <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
    <Copy accessibilityRole="header" size="heading" style={{ fontWeight: '700' }}>Make room for a good meal.</Copy>
    <Copy tone="muted">Choose how to log. Review the portion before saving.</Copy>
    {syncError && <Notice title="Saved diary available" message="Meal sync is pending. New entries are saved on this device first." />}
    <Card><Action label="Scan nutrition label" onPress={() => navigation.navigate('LabelScanner', { mealType: 'lunch' })} />
      <Action secondary label="Search food" onPress={() => open('search')} />
      <Action secondary label="Manual entry" onPress={() => open('manual')} />
      {betaFeatures.ai ? <Action secondary label="Photo or description estimate" onPress={() => open('photo')} /> : <Copy size="caption" tone="muted">Photo and AI estimates are unavailable in this beta.</Copy>}
    </Card>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Action secondary selected={tab === 'today'} label="Today’s diary" onPress={() => setTab('today')} />
      <Action secondary selected={tab === 'recent'} label="Recent foods" onPress={() => setTab('recent')} />
      <Action secondary selected={tab === 'favorites'} label="Favorite foods" onPress={() => setTab('favorites')} />
    </View>
    <Field label="Search this list" placeholder="Filter foods…" value={query} onChangeText={setQuery} autoCapitalize="none" returnKeyType="search" />
    <Copy tone="muted" size="caption">Recent foods use the last 30 days saved on this device. Favorites are device-only and included in account export/deletion.</Copy>
    {error && <Notice error title="Couldn’t load or update saved foods" message="Try reopening this screen. You can still search or enter a meal." />}
    {rows.length === 0 && <Card><Notice title={needle ? `No foods match “${query.trim()}”` : tab === 'today' ? 'No meals logged today' : tab === 'recent' ? 'Your recent foods will appear here' : 'No favorites yet'} message={needle ? 'Try a different search term.' : 'Save a meal, then tap the heart on Recent foods.'} /></Card>}
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
    <Action secondary label="Discover recipes" onPress={() => open('recipes')} />
    <Action secondary label="View food history" onPress={() => navigation.navigate('History')} />
  </KeyboardAwareScrollView>;
}
