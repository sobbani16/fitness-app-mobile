import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { IngredientResult, searchIngredients } from '../api/ingredients';
import { Action, Copy, Field, Notice, Skeleton } from '../design/components';
export default function IngredientSearch({ onSelect }: { onSelect: (ingredient: IngredientResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IngredientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setResults([]); setError(false);
    if (query.trim().length < 2) { setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      searchIngredients(query.trim()).then(rows => { if (live) setResults(rows); })
        .catch(() => { if (live) setError(true); }).finally(() => { if (live) setSearching(false); });
    }, 350);
    return () => { live = false; clearTimeout(timer); };
  }, [query, retry]);
  return <View style={{ gap: 12 }}><Field label="Search food" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} placeholder="Chicken, rice, chickpeas…" />
    {searching && <Skeleton label="Searching foods" />}
    {error && <><Notice error title="Search unavailable" message="Check your connection and retry, or enter nutrition manually." /><Action secondary label="Retry food search" onPress={() => setRetry(value => value + 1)} /></>}
    {!searching && !error && query.trim().length >= 2 && results.length === 0 && <Copy tone="muted">No matching foods. Try another name or manual entry.</Copy>}
    {results.map(item => <Action secondary key={item.id} label={`${item.name} · ${item.caloriesPer100g} kcal per 100 g`} onPress={() => { onSelect(item); setQuery(''); }} />)}
  </View>;
}
