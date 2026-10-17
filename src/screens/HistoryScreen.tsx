import React, { useCallback, useRef, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Action, BarChart, Card, Copy, Notice, Skeleton } from '../design/components';
import HistoryCalendar from '../components/HistoryCalendar';
import { useTheme } from '../design/theme';
import { useProfile } from '../context/ProfileContext';
import { cachedProgress, chartPoints, dateWindow, fetchProgress, mean, Metric, ProgressDay } from '../services/progress';
import { getSession } from '../storage/session';
import { loadMealsFor, LoggedMeal } from '../storage/meals';
import { reconcileMealDays } from '../services/mealSync';
import { formatWeight } from '../util/units';
const metrics: { key: Metric; label: string; unit: string }[] = [
  { key: 'calories', label: 'Logged calories', unit: 'kcal' }, { key: 'weightKg', label: 'Weight', unit: 'kg' },
  { key: 'protein', label: 'Protein', unit: 'g' }, { key: 'carbs', label: 'Carbohydrate', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' }, { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'waterMl', label: 'Water logged', unit: 'ml' }, { key: 'steps', label: 'Steps recorded', unit: 'steps' },
  { key: 'workouts', label: 'Workout sessions', unit: 'sessions' },
];
export default function HistoryScreen() {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const [days, setDays] = useState(7), [offset, setOffset] = useState(0);
  const [entries, setEntries] = useState<ProgressDay[]>([]);
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(''), [cached, setCached] = useState(true);
  const [metric, setMetric] = useState<Metric>('calories');
  const [selected, setSelected] = useState<string | null>(null);
  const [meals, setMeals] = useState<LoggedMeal[]>([]), [mealError, setMealError] = useState('');
  const [mealLoading, setMealLoading] = useState(false);
  const request = useRef(0), diaryRequest = useRef(0);
  const load = useCallback(async () => {
    const generation = ++request.current, account = getSession()?.user.id;
    const current = () => generation === request.current && !!account && getSession()?.user.id === account;
    diaryRequest.current++; setSelected(null); setMeals([]); setMealLoading(false); setMealError('');
    const ending = new Date(); ending.setDate(ending.getDate() - offset);
    const dates = dateWindow(days * 2, ending), zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    setError(''); setEntries([]); setLoading(true); setCached(true);
    try {
      try { const saved = await cachedProgress(dates, zone); if (current()) setEntries(saved); } catch { /* Still attempt server recovery. */ }
      if (!current()) return;
      setLoading(false); setRefreshing(true);
      const result = await fetchProgress(dates, zone);
      if (current()) { setEntries(result); setCached(false); }
    } catch {
      if (current()) setError('Could not sync progress. Showing saved records where available; missing records remain unknown.');
    } finally { if (current()) { setLoading(false); setRefreshing(false); } }
  }, [days, offset]);
  useFocusEffect(useCallback(() => { void load(); return () => { request.current++; diaryRequest.current++; }; }, [load]));
  const selectDay = async (date: string) => {
    const token = ++diaryRequest.current, account = getSession()?.user.id;
    const current = () => token === diaryRequest.current && getSession()?.user.id === account;
    setSelected(date); setMeals([]); setMealError(''); setMealLoading(true);
    const day = new Date(`${date}T12:00:00`);
    try {
      const saved = await loadMealsFor(day); if (current()) setMeals(saved);
      await reconcileMealDays([day]);
      const latest = await loadMealsFor(day); if (current()) setMeals(latest);
    } catch { if (current()) setMealError('Could not sync this diary. Showing meals saved on this device.'); }
    finally { if (current()) setMealLoading(false); }
  };
  const visible = entries.slice(-days), previous = entries.slice(0, -days);
  const choice = metrics.find(m => m.key === metric)!;
  const imperialWeight = metric === 'weightKg' && profile?.units === 'imperial';
  const chartEntries = imperialWeight ? visible.map(d => ({ ...d, weightKg: d.weightKg === null ? null : d.weightKg / 0.45359237 })) : visible;
  const average = mean(visible, metric), prior = mean(previous, metric);
  const unit = imperialWeight ? 'lb' : choice.unit;
  const number = (value: number | null) => value === null ? 'No records' : `${Math.round((imperialWeight ? value / 0.45359237 : value) * 10) / 10} ${unit}`;
  const detail = visible.find(d => d.date === selected);
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
    <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Progress</Copy>
    <Copy tone="muted">Patterns in your records, at your pace. A missing log does not describe what you ate or how active you were.</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[7, 30, 90].map(n => <Action key={n} label={`${n} days`} secondary={days !== n} selected={days === n} onPress={() => { setDays(n); setOffset(0); }} />)}</View>
    <View style={{ gap: 8 }}><Action label={`Older ${days} days`} secondary onPress={() => setOffset(n => n + days)} /><Action label={`Newer ${days} days`} secondary disabled={offset === 0} onPress={() => setOffset(n => Math.max(0, n - days))} /></View>
    {loading && <Skeleton label="Loading progress" />}
    {refreshing && <Copy tone="muted">Updating records…</Copy>}
    {!!error && <Card><Notice title="Saved progress" message={error} error /><Action label="Retry progress" onPress={load} /></Card>}
    {!!visible.length && <>
      <Copy>{visible[0].date} – {visible.at(-1)!.date}</Copy>
      <Copy tone="muted">{cached ? 'Saved snapshot and available device meals; may be incomplete.' : 'Synced records only. Pending device logs may not appear yet.'}</Copy>
      <Card><Copy size="heading">Logging consistency</Copy>
        <Copy>{visible.filter(d => d.mealCount > 0).length} of {days} days have meal records</Copy>
        <Copy>{visible.filter(d => d.workouts !== null && d.workouts > 0).length} days have workout records</Copy>
        <Copy tone="muted">Logging is not proof that a day is complete. Workout sessions may include unfinished workouts.</Copy>
      </Card>
      <Card><Copy size="heading">Explore a trend</Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{metrics.map(m => <Action key={m.key} label={m.label} selected={metric === m.key} secondary={metric !== m.key} onPress={() => setMetric(m.key)} />)}</View>
        <Copy>{choice.label}: {number(average.value)} average across {average.count} recorded days</Copy>
        <Copy>Previous {days} days: {number(prior.value)} across {prior.count} recorded days</Copy>
        {average.value !== null && prior.value !== null && <Copy>Difference in recorded averages: {number(average.value - prior.value)}</Copy>}
        <Copy tone="muted">Averages use recorded days only; gaps are not zero. Differences can reflect logging coverage. Weight uses the last measurement each day. Bars group daily averages for longer windows.</Copy>
        {metric === 'steps' && <Copy tone="muted">Step records may cover only part of a day. Duplicate legacy daily totals use the highest count.</Copy>}
        <BarChart points={chartPoints(chartEntries, metric)} unit={unit} />
      </Card>
      <Card><Copy size="heading">Daily history</Copy><Copy tone="muted">Choose a date to review its records and saved meals.</Copy>
        <HistoryCalendar days={visible} selected={selected} onSelect={date => void selectDay(date)} />
      </Card>
      {detail && <Card><Copy size="heading">{detail.date}</Copy>
        <Copy>{detail.calories === null ? 'No calorie records' : `${Math.round(detail.calories)} kcal logged`}</Copy>
        <Copy>{detail.weightKg === null ? 'No weight recorded' : formatWeight(detail.weightKg, profile?.units || 'metric')}</Copy>
        <Copy>{detail.waterMl === null ? 'No water recorded' : `${detail.waterMl} ml water logged`}</Copy>
        <Copy>{detail.steps === null ? 'No steps recorded' : `${detail.steps} steps recorded`}</Copy>
        {mealLoading && <Skeleton label="Updating selected diary" />}
        {!!mealError && <><Notice title="Saved diary" message={mealError} /><Action label="Retry selected day" onPress={() => void selectDay(detail.date)} /></>}
        {meals.map(m => <Copy key={m.id}>{m.name} · {m.calories} kcal saved</Copy>)}
        {!mealLoading && !meals.length && <Copy tone="muted">No saved meals available for this day.</Copy>}
      </Card>}
    </>}
    <Card><Copy size="heading">About health scores</Copy><Copy tone="muted">Scores are provisional estimates and can change as you log. There is no confirmed complete-day score in this version. Progress does not rank foods or days, infer a physiological calorie deficit, or suggest exercise to offset eating.</Copy></Card>
  </ScrollView>;
}
