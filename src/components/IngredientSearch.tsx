import React, { useEffect, useState } from 'react';
import { Keyboard, View } from 'react-native';
import { IngredientResult, searchIngredients, verificationLabel, loadIngredientSelections, selectIngredient } from '../api/ingredients';
import { Action, Copy, Field, IconAction, ListRow, Notice, Skeleton } from '../design/components';
export default function IngredientSearch({ onSelect }: { onSelect: (ingredient: IngredientResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IngredientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(false);
  const [preparation, setPreparation] = useState('');
  const [productType, setProductType] = useState('');
  const [saved, setSaved] = useState<IngredientResult[]>([]);
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
  const shown = query.trim() ? results : saved;
  const toggleFavorite = (item: IngredientResult) => {
    void selectIngredient(item.id, !item.favorite).then(() => {
      const update = (rows: IngredientResult[]) => rows.map(x => x.id === item.id ? { ...x, favorite: !item.favorite } : x);
      setResults(update); setSaved(update);
    }).catch(() => setError(true));
  };
  return <View style={{ gap: 12 }}><Field label="Search food" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} placeholder="Chicken, rice, chickpeas…" returnKeyType="search" />
    {searching && <Skeleton label="Searching foods" />}
    {error && <><Notice error title="Search unavailable" message="Check your connection and retry, or enter nutrition manually." /><Action secondary label="Retry food search" onPress={() => setRetry(value => value + 1)} /></>}
    {!searching && !error && query.trim().length >= 2 && results.length === 0 && <Copy tone="muted">No matching foods. Try another name or manual entry.</Copy>}
    {/* Results sit directly under the field so they're visible while typing. */}
    {shown.slice(0, 12).map(item => <ListRow key={item.id}
      title={`${item.name}${item.preparation ? ` (${item.preparation})` : ''}`}
      subtitle={`${item.verificationLevel && item.verificationLevel !== 'SOURCE_BACKED_FULL' ? '≈ ' : ''}${item.caloriesPer100g} kcal per 100 g · ${verificationLabel(item)}`}
      onPress={() => { Keyboard.dismiss(); onSelect(item); setQuery(''); setSaved([]); void selectIngredient(item.id).catch(() => {}); }}>
      <IconAction label={item.favorite ? `Unfavorite ${item.name}` : `Favorite ${item.name}`} icon={item.favorite ? '♥' : '♡'} onPress={() => toggleFavorite(item)} />
    </ListRow>)}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Action secondary label={preparation ? `Preparation: ${preparation}` : 'Any preparation'} selected={!!preparation} onPress={() => setPreparation(value => value === '' ? 'raw' : value === 'raw' ? 'cooked' : '')} />
      <Action secondary label={productType ? `Products: ${productType}` : 'All products'} selected={!!productType} onPress={() => setProductType(value => value === '' ? 'branded' : value === 'branded' ? 'generic' : '')} />
      <Action secondary label="Recent foods" onPress={() => loadIngredientSelections().then(setSaved).catch(() => setError(true))} />
      <Action secondary label="Favorite foods" onPress={() => loadIngredientSelections(true).then(setSaved).catch(() => setError(true))} /></View>
  </View>;
}
