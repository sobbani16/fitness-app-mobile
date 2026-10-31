import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Action, BarChart, Card, Copy, Notice, Progress, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { getHealthScore, getHealthTrend, HealthScoreResponse, TrendPoint } from '../api/healthScore';
import { getSession } from '../storage/session';
const valid = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100;
const labels = { macro: 'Logged nutrients', condition: 'Condition-rule estimate', foodQuality: 'Food-rule estimate', activity: 'Recorded activity', recovery: 'Recorded recovery' };
export default function HealthScoreDetailScreen() {
  const { colors } = useTheme();
  const [score, setScore] = useState<HealthScoreResponse | null>(null), [trend, setTrend] = useState<TrendPoint[]>([]);
  const [days, setDays] = useState(7), [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const generation = useRef(0);
  useFocusEffect(useCallback(() => {
    const token = ++generation.current, account = getSession()?.user.id;
    setLoading(true); setError(''); setScore(null); setTrend([]);
    Promise.allSettled([getHealthScore(), getHealthTrend(days)]).then(([current, history]) => {
      if (token !== generation.current || account !== getSession()?.user.id) return;
      if (current.status === 'fulfilled') setScore(current.value);
      if (history.status === 'fulfilled') setTrend(history.value);
      if (current.status === 'rejected' || history.status === 'rejected') setError('Some score information could not load. Try again when connected.');
      setLoading(false);
    });
    return () => { generation.current++; };
    // Retry intentionally refreshes the focused request without changing its parameters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, retry]));
  const size = Math.max(1, Math.ceil(trend.length / 10));
  const points = [];
  for (let i = 0; i < trend.length; i += size) {
    const batch = trend.slice(i, i + size), values = batch.filter(t => valid(t.score));
    points.push({ label: `${batch[0].date.slice(0, 10)}${batch.length > 1 ? ` – ${batch.at(-1)!.date.slice(0, 10)}` : ''} · ${values.length} snapshots`, value: values.length ? Math.round(values.reduce((s, t) => s + t.score, 0) / values.length) : null });
  }
  const strengths = (score?.topContributors ?? []).filter(c => c.scoreImpact > 0).slice(0, 3);
  const worthReviewing = (score?.topContributors ?? []).filter(c => c.scoreImpact < 0).slice(0, 3);
  const coverage = score?.coverage;
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
    <Copy size="title" accessibilityRole="header">Understanding your score</Copy>
    <Notice title="Provisional estimate" message="This score summarizes logged nutrients, food rules, activity and recovery. It is not a medical assessment or a grade for your day." />
    <Card><Copy size="heading">Data coverage</Copy>
      <Copy>{coverage ? `${coverage.available} of ${coverage.total} score parts have recorded data today.` : 'Coverage is unknown — records could not all be checked.'}</Copy>
      <Copy tone="muted">Missing meals, activity or recovery records are excluded rather than scored as zero. A low score may reflect missing records. You do not need to exercise to compensate for eating.</Copy></Card>
    {loading && <Skeleton label="Loading score details" />}
    {!!error && <Card><Notice title="Score unavailable" message={error} error /><Action label="Retry score" onPress={() => setRetry(v => v + 1)} /></Card>}
    {score && <Card><Copy size="heading">Current provisional score</Copy><Copy>{valid(score.score) ? `${score.score} / 100` : 'Not enough recorded data today — no score is calculated.'}</Copy>
      {(Object.keys(labels) as (keyof typeof labels)[]).map(key => {
        const component = score.components[key];
        const unavailable = component?.available === false || !valid(component?.score);
        return <View key={key} style={{ gap: 4 }}><Copy>{labels[key]}: {unavailable ? 'No records — excluded from today’s score' : `${component!.score} / 100`}</Copy>
          <Progress label={labels[key]} value={unavailable ? null : component!.score} target={100} />
          {component && Number.isFinite(component.weight) && <Copy size="caption" tone="muted">{Math.round(component.weight * 100)}% of the formula when data exists</Copy>}
        </View>;
      })}
      <Copy tone="muted">Component rules and weights are heuristics. Condition and food rules have not been clinically validated; personalized disease restrictions and food-ranking advice are not shown here.</Copy>
    </Card>}
    {!!strengths.length && <Card><Copy size="heading">What is supporting the score</Copy>
      {strengths.map((c, i) => <Copy key={i}>• {c.itemName} — {c.reason}</Copy>)}
    </Card>}
    {!!worthReviewing.length && <Card><Copy size="heading">Worth reviewing</Copy>
      {worthReviewing.map((c, i) => <Copy key={i}>• {c.itemName} — {c.reason}</Copy>)}
      <Copy size="caption" tone="muted">These come from your logged records and the rule descriptions above — not from a clinical assessment.</Copy>
    </Card>}
    {/* Raw provider-written insight messages are intentionally not rendered:
        only the structured, rule-generated contributors above are shown. */}
    <Card><Copy size="heading">Saved score snapshots</Copy><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[7, 30, 90].map(n => <Action key={n} label={`${n} days`} selected={days === n} secondary={days !== n} onPress={() => setDays(n)} />)}</View>
      <Copy tone="muted">Snapshots are provisional and may reflect different logging coverage. Missing dates are not zero; grouped bars average available snapshots only.</Copy>
      {points.length ? <BarChart points={points} unit="points" /> : !loading && <Copy>No saved snapshots available.</Copy>}
    </Card>
  </ScrollView>;
}
