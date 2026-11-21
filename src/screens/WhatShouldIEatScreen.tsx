import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useTheme } from '../design/theme';
import { Action, Card, Copy, Notice, Skeleton } from '../design/components';
import { suggestMeals, SuggestResponse, MealSuggestion } from '../api/nutrition';

export default function WhatShouldIEatScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [data, setData] = useState<SuggestResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await suggestMeals({ occasion: 'meal', limit: 8 })); }
    catch { setError('Suggestions are unavailable right now. Your meals and recipes still work.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const item = (s: MealSuggestion) => (
    <Card key={s.recipeId}>
      <Copy size="title">{s.recipeName}</Copy>
      <Copy size="caption" tone="muted">
        {[s.cuisine, s.completeness === 'COMPLETE_FROM_REVIEWED_INPUTS' ? 'reviewed inputs' : s.completeness === 'UNKNOWN_COMPOSITION' ? 'composition unknown' : 'estimated nutrition'].filter(Boolean).join(' · ')}
      </Copy>
      {s.perServing.calories != null && (
        <Copy>{s.perServing.calories} kcal · {s.perServing.proteinG ?? '?'}g protein · {s.perServing.carbsG ?? '?'}g carbs · {s.perServing.fatG ?? '?'}g fat{s.perServing.fiberG != null ? ` · ${s.perServing.fiberG}g fiber` : ''}</Copy>
      )}
      {s.why.map((w, i) => <Copy key={i} size="caption" tone="muted">• {w}</Copy>)}
      {s.education.map(e => <Copy key={e.title} size="caption" tone="muted">{e.title}: {e.portionNote}</Copy>)}
      {s.warnings.map((w, i) => <Notice key={i} title="Heads up" message={w} />)}
      <Action secondary label="Open recipe" onPress={() => navigation.navigate('RecipeDetail', { recipeId: s.recipeId })} />
    </Card>
  );
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Copy size="heading" accessibilityRole="header">What should I eat?</Copy>
      {loading && <Skeleton />}
      {error !== '' && <Notice error title="Couldn’t load" message={error} />}
      {data && <>
        {data.context.loggedCompleteness !== 'full-window' && (
          <Notice title="Partial day" message="These suggestions use what you’ve logged so far — missing meals are unknown, not zero." />
        )}
        {data.items.length === 0 && <Notice title="No eligible recipes" message="Your allergy and reviewed-rule exclusions filtered everything. Adjust filters or log less." />}
        {data.items.map(item)}
        <Copy size="caption" tone="muted">{data.disclaimer}{data.aiPersonalized ? ' Ranked with AI; safety checks still apply.' : ''}</Copy>
        <Action secondary label="Refresh" onPress={() => void load()} />
      </>}
    </ScrollView>
  );
}
