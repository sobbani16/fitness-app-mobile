import React, { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getMealSuggestions, MealSuggestResponse } from '../api/mealSuggest';
import { Card, Copy, Action, Skeleton, Notice } from '../design/components';
import EmptyState from '../components/ui-states/EmptyState';

const OCCASIONS = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

export default function SuggestScreen() {
  const [data, setData] = useState<MealSuggestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<string | undefined>(undefined);

  const load = useCallback(async (occ?: string) => {
    setError(null);
    try { setData(await getMealSuggestions(occ)); }
    catch (e: any) { setError(e.response?.data?.error || e.message || 'Could not load suggestions.'); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); void load(occasion); }, [load, occasion]));

  return (
    <FlatList
      contentContainerStyle={{ padding: 16, gap: 12 }}
      data={data?.options ?? []}
      keyExtractor={(o, i) => o.recipeId ?? `${o.name}-${i}`}
      ListHeaderComponent={<>
        <Card>
          <Copy size="title" style={{ fontWeight: '600' }}>What should I eat?</Copy>
          <Copy tone="muted">Suggestions for {data?.occasion ?? occasion ?? 'now'} — filtered by your allergies and restrictions before ranking.</Copy>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {OCCASIONS.map(o => (
              <Action key={o} secondary={occasion !== o && data?.occasion !== o} label={o}
                onPress={() => setOccasion(o)} />
            ))}
          </View>
        </Card>
        {error ? <Notice title="Unavailable" message={error} /> : null}
        {loading ? <Skeleton label="Finding suggestions" /> : null}
        {!loading && data?.emptyReason ? <EmptyState title="No suggestions yet" description={data.emptyReason} /> : null}
        {!loading && data ? (
          <Copy size="caption" tone="muted">
            {data.eligibility.excludedRecipes > 0 ? `${data.eligibility.excludedRecipes} recipes excluded by your filters. ` : ''}
            {data.context.note}
          </Copy>
        ) : null}
      </>}
      renderItem={({ item }) => (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Copy style={{ fontWeight: '600', flex: 1 }}>{item.name}</Copy>
            <Copy size="caption" tone="muted">{item.nutrition.calories != null ? `${Math.round(item.nutrition.calories)} kcal` : ''}</Copy>
          </View>
          {item.cuisine ? <Copy size="caption" tone="muted">{item.cuisine}</Copy> : null}
          {item.reasons.map((r, i) => <Copy key={i} size="caption" tone="muted">· {r}</Copy>)}
          {item.nutrition.proteinG != null && <Copy size="caption" tone="muted">Protein {Math.round(item.nutrition.proteinG)}g{item.fromPlan ? ' · from your plan' : ''}</Copy>}
        </Card>
      )}
    />
  );
}
