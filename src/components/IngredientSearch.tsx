import React, { useEffect, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IngredientResult, searchIngredients, verificationLabel, loadIngredientSelections, selectIngredient } from '../api/ingredients';
import { Action, Copy, Field, IconAction, ListRow, Notice, Sheet, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';

const PREPARATIONS = [
  { value: '', label: 'Any preparation' },
  { value: 'raw', label: 'Raw' },
  { value: 'cooked', label: 'Cooked' },
];
const PRODUCT_TYPES = [
  { value: '', label: 'All products' },
  { value: 'generic', label: 'Generic' },
  { value: 'branded', label: 'Branded' },
];
const SAVED_TABS = [
  { value: 'recent', label: 'Recent' },
  { value: 'favorites', label: 'Favorites' },
] as const;

export default function IngredientSearch({ onSelect }: { onSelect: (ingredient: IngredientResult) => void }) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IngredientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(false);
  const [preparation, setPreparation] = useState('');
  const [productType, setProductType] = useState('');
  const [saved, setSaved] = useState<IngredientResult[]>([]);
  const [savedTab, setSavedTab] = useState<'recent' | 'favorites'>('recent');
  const [savedError, setSavedError] = useState(false);
  const [selected, setSelected] = useState<IngredientResult | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let live = true;
    setResults([]); setError(false);
    if (query.trim().length < 2) { setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      searchIngredients(query.trim(), { preparation: preparation || undefined, productType: productType || undefined }).then(rows => { if (live) setResults(rows); })
        .catch(() => { if (live) setError(true); }).finally(() => { if (live) setSearching(false); });
    }, 350);
    return () => { live = false; clearTimeout(timer); };
  }, [query, retry, preparation, productType]);

  useEffect(() => {
    let live = true;
    loadIngredientSelections(savedTab === 'favorites').then(rows => { if (live) { setSaved(rows); setSavedError(false); } })
      .catch(() => { if (live) setSavedError(true); });
    return () => { live = false; };
  }, [savedTab, retry]);

  const isSearching = query.trim().length >= 2;
  const pick = (item: IngredientResult) => {
    Keyboard.dismiss();
    setSelected(item);
    setQuery('');
    setResults([]);
    onSelect(item);
    void selectIngredient(item.id).catch(() => {});
  };
  const toggleFavorite = (item: IngredientResult) => {
    void selectIngredient(item.id, !item.favorite).then(() => {
      const update = (rows: IngredientResult[]) => rows.map(x => x.id === item.id ? { ...x, favorite: !item.favorite } : x);
      setResults(update); setSaved(update);
      setSelected(current => current?.id === item.id ? { ...current, favorite: !item.favorite } : current);
    }).catch(() => setError(true));
  };
  const title = (item: IngredientResult) => `${item.name}${item.preparation ? ` (${item.preparation})` : ''}`;
  const subtitle = (item: IngredientResult) => `${item.verificationLevel && item.verificationLevel !== 'SOURCE_BACKED_FULL' ? '≈ ' : ''}${item.caloriesPer100g} kcal per 100 g · ${verificationLabel(item)}`;
  const row = (item: IngredientResult) => <ListRow key={item.id}
    title={title(item)}
    subtitle={subtitle(item)}
    onPress={() => pick(item)}>
    <IconAction label={item.favorite ? `Unfavorite ${item.name}` : `Favorite ${item.name}`} icon={item.favorite ? '♥' : '♡'} onPress={() => toggleFavorite(item)} />
  </ListRow>;

  const optionRow = (label: string, active: boolean, onPress: () => void) => (
    <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 14, borderRadius: 12,
        borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.track : 'transparent', opacity: pressed ? 0.7 : 1 })}>
      <Copy style={{ fontWeight: active ? '700' : '500', color: active ? colors.primary : colors.text }}>{label}</Copy>
      {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
    </Pressable>
  );

  const activeFilters = [
    PREPARATIONS.find(o => o.value === preparation)?.label,
    PRODUCT_TYPES.find(o => o.value === productType)?.label,
  ].filter((l): l is string => Boolean(l) && l !== 'Any preparation' && l !== 'All products');
  const filterLabel = activeFilters.length ? `Filters: ${activeFilters.join(' · ')}` : 'Filters';

  return <View style={{ gap: 12 }}>
    <Field label="Search food" value={query} onChangeText={text => { setQuery(text); if (text.trim()) setSelected(null); }} autoCapitalize="none" autoCorrect={false} placeholder="Chicken, rice, chickpeas…" returnKeyType="search" />

    <Pressable accessibilityRole="button" accessibilityLabel={filterLabel} accessibilityHint="Choose preparation and product filters"
      onPress={() => setFiltersOpen(true)}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 14, borderRadius: 14,
        borderWidth: 1, borderColor: activeFilters.length ? colors.primary : colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 })}>
      <Copy style={{ fontWeight: '600' }}>{filterLabel}</Copy>
      <Ionicons name="chevron-down" size={16} color={colors.muted} />
    </Pressable>
    {filtersOpen && <Sheet visible title="Search filters" onClose={() => setFiltersOpen(false)}>
      <Copy tone="muted" size="caption">Preparation</Copy>
      {PREPARATIONS.map(opt => optionRow(opt.label, preparation === opt.value, () => setPreparation(opt.value)))}
      <Copy tone="muted" size="caption">Products</Copy>
      {PRODUCT_TYPES.map(opt => optionRow(opt.label, productType === opt.value, () => setProductType(opt.value)))}
    </Sheet>}

    {isSearching && <>
      {searching && <Skeleton label="Searching foods" />}
      {error && <><Notice error title="Search unavailable" message="Check your connection and retry, or enter nutrition manually." /><Action secondary label="Retry food search" onPress={() => setRetry(value => value + 1)} /></>}
      {!searching && !error && results.length === 0 && <Copy tone="muted">No matching foods. Try another name or manual entry.</Copy>}
      {results.slice(0, 12).map(row)}
    </>}

    {selected && !isSearching && <ListRow
      title={title(selected)}
      subtitle={`Selected · ${subtitle(selected)}`}
      selected>
      <IconAction label={selected.favorite ? `Unfavorite ${selected.name}` : `Favorite ${selected.name}`} icon={selected.favorite ? '♥' : '♡'} onPress={() => toggleFavorite(selected)} />
      <IconAction label={`Change food: ${selected.name}`} icon="✕" onPress={() => setSelected(null)} />
    </ListRow>}

    {!isSearching && !selected && <>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {SAVED_TABS.map(tab => <View key={tab.value} style={{ flex: 1, minWidth: 0 }}>
          <Action secondary label={tab.label} selected={savedTab === tab.value} onPress={() => setSavedTab(tab.value)} />
        </View>)}
      </View>
      {savedError && <><Notice error title="Saved foods unavailable" message="Check your connection and retry." /><Action secondary label="Retry saved foods" onPress={() => setRetry(value => value + 1)} /></>}
      {!savedError && saved.length === 0 && <Copy tone="muted">{savedTab === 'recent' ? 'Foods you log will show up here for quick reuse.' : 'Tap the heart on a food to keep it here.'}</Copy>}
      {saved.slice(0, 12).map(row)}
    </>}
  </View>;
}
