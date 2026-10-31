import React, { useEffect, useState, useCallback } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { getClientProgress, ClientProgress } from '../api/trainers';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Action, BarChart, Card, Copy, ListRow, Notice, Segmented, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import StatTile from '../components/StatTile';
import { chartPoints, ProgressDay } from '../services/progress';

type RoutePropType = RouteProp<RootStackParamList, 'ClientProgress'>;

type Period = 'daily' | 'weekly' | 'monthly' | '6months';

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
        <Copy style={{ fontWeight: '700' }}>{title}</Copy>
      </View>
      {children}
    </Card>
  );
}

function NoData() {
  return <Notice title="No data this period" message="No records were found for this metric in the selected window." />;
}

function StatRow({ tiles }: { tiles: { label: string; value: string | number; tone?: 'text' | 'muted' | 'primary' | 'danger' }[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {tiles.map((t) => <StatTile key={t.label} label={t.label} value={t.value} tone={t.tone} />)}
    </View>
  );
}

function LogRow({ date, value }: { date: string; value: string }) {
  return <ListRow title={date}><Copy size="caption" tone="muted">{value}</Copy></ListRow>;
}

const dayOf = (entry: any): string =>
  String(entry?.date ?? entry?.recordedAt ?? entry?.startedAt ?? '').slice(0, 10);

const emptyDay = (date: string): ProgressDay => ({
  date, mealCount: 0, calories: null, protein: null, carbs: null, fat: null,
  fiber: null, weightKg: null, waterMl: null, steps: null, workouts: null,
});

/** Last weight measurement per day — later entries in the feed win. */
function weightDays(entries: any[]): ProgressDay[] {
  const byDate = new Map<string, number>();
  entries.forEach((e) => {
    const date = dayOf(e);
    if (date && Number.isFinite(e.weightKg)) byDate.set(date, e.weightKg);
  });
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([date, weightKg]) => ({ ...emptyDay(date), weightKg }));
}

/** Duplicate daily totals keep the highest count. */
function stepDays(steps: any[]): ProgressDay[] {
  const byDate = new Map<string, number>();
  steps.forEach((s) => {
    const date = dayOf(s);
    if (date && Number.isFinite(s.steps)) byDate.set(date, Math.max(byDate.get(date) ?? 0, s.steps));
  });
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([date, steps]) => ({ ...emptyDay(date), steps }));
}

/** Session count per day. */
function workoutDays(sessions: any[]): ProgressDay[] {
  const byDate = new Map<string, number>();
  sessions.forEach((s) => {
    const date = dayOf(s);
    if (date) byDate.set(date, (byDate.get(date) ?? 0) + 1);
  });
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([date, workouts]) => ({ ...emptyDay(date), workouts }));
}

function Trend({ points, unit }: { points: { label: string; value: number | null }[]; unit: string }) {
  if (points.length < 2) return null;
  return <BarChart points={points} unit={unit} />;
}

function WeightSection({ entries }: { entries: any[] }) {
  if (!entries.length) return <NoData />;
  const latest = entries[entries.length - 1];
  const first = entries[0];
  const change = latest.weightKg - first.weightKg;
  return (
    <>
      <StatRow tiles={[
        { label: 'Latest', value: `${latest.weightKg.toFixed(1)} kg` },
        { label: 'Change', value: `${change >= 0 ? '+' : ''}${change.toFixed(1)} kg`, tone: change < 0 ? 'primary' : change > 0 ? 'danger' : 'text' },
        { label: 'Entries', value: entries.length },
      ]} />
      <Trend points={chartPoints(weightDays(entries), 'weightKg')} unit="kg" />
      {entries.slice(-5).reverse().map((e) => (
        <LogRow key={e.id} date={new Date(e.recordedAt).toLocaleDateString()} value={`${e.weightKg.toFixed(1)} kg`} />
      ))}
    </>
  );
}

function MacroSection({ scores }: { scores: any[] }) {
  if (!scores.length) return <NoData />;
  const avg = (field: string) =>
    (scores.reduce((sum, s) => sum + (s[field] ?? 0), 0) / scores.length).toFixed(1);
  return (
    <>
      <StatRow tiles={[
        { label: 'Avg Score', value: `${avg('overallScore')}%` },
        { label: 'Avg Cal', value: avg('calories') },
        { label: 'Avg Protein', value: `${avg('proteinG')}g` },
      ]} />
      {scores.slice(-5).reverse().map((s) => (
        <LogRow key={s.id} date={s.date} value={`${Number(s.overallScore).toFixed(0)}% · ${Number(s.calories).toFixed(0)} kcal`} />
      ))}
    </>
  );
}

function WorkoutSection({ sessions }: { sessions: any[] }) {
  if (!sessions.length) return <NoData />;
  const totalMin = sessions.reduce((s, w) => s + w.durationMinutes, 0);
  const totalCal = sessions.reduce((s, w) => s + (w.caloriesBurned ?? 0), 0);
  return (
    <>
      <StatRow tiles={[
        { label: 'Sessions', value: sessions.length },
        { label: 'Total Min', value: totalMin },
        { label: 'Calories', value: totalCal.toFixed(0) },
      ]} />
      <Trend points={chartPoints(workoutDays(sessions), 'workouts')} unit="sessions" />
      {sessions.slice(-5).reverse().map((s) => (
        <LogRow key={s.id} date={new Date(s.startedAt).toLocaleDateString()} value={`${s.workoutType} · ${s.durationMinutes} min`} />
      ))}
    </>
  );
}

function HealthScoreSection({ scores }: { scores: any[] }) {
  if (!scores.length) return <NoData />;
  const avg = (scores.reduce((s, h) => s + h.score, 0) / scores.length).toFixed(1);
  return (
    <>
      <StatRow tiles={[
        { label: 'Avg Score', value: avg },
        { label: 'Latest', value: scores[scores.length - 1].score.toFixed(0) },
        { label: 'Days', value: scores.length },
      ]} />
      {scores.slice(-5).reverse().map((h) => (
        <LogRow key={h.id} date={h.date} value={`${h.score.toFixed(0)} · ${h.status}`} />
      ))}
    </>
  );
}

function StepsSection({ steps }: { steps: any[] }) {
  if (!steps.length) return <NoData />;
  const total = steps.reduce((s, d) => s + d.steps, 0);
  const avg = Math.round(total / steps.length);
  return (
    <>
      <StatRow tiles={[
        { label: 'Avg / Day', value: avg.toLocaleString() },
        { label: 'Total', value: total.toLocaleString() },
        { label: 'Days', value: steps.length },
      ]} />
      <Trend points={chartPoints(stepDays(steps), 'steps')} unit="steps" />
    </>
  );
}

function SleepSection({ sleep }: { sleep: any[] }) {
  if (!sleep.length) return <NoData />;
  const withHours = sleep.filter((s) => s.hoursSlept != null);
  const avg = withHours.length
    ? (withHours.reduce((s, l) => s + l.hoursSlept, 0) / withHours.length).toFixed(1)
    : 'N/A';
  return (
    <>
      <StatRow tiles={[
        { label: 'Avg Sleep', value: `${avg} hrs` },
        { label: 'Nights', value: sleep.length },
      ]} />
      {sleep.slice(-5).reverse().map((s) => (
        <LogRow key={s.id} date={new Date(s.sleepStart).toLocaleDateString()} value={`${s.hoursSlept?.toFixed(1) ?? '?'} hrs`} />
      ))}
    </>
  );
}

export default function ClientProgressScreen() {
  const route = useRoute<RoutePropType>();
  const { colors } = useTheme();
  const { clientId } = route.params;

  const [period, setPeriod] = useState<Period>('weekly');
  const [data, setData] = useState<ClientProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: Period) => {
    setError(null);
    try {
      const result = await getClientProgress(clientId, p);
      setData(result);
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId]);

  useEffect(() => { load(period); }, [period, load]);

  const onRefresh = () => { setRefreshing(true); load(period); };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, gap: 16 }}>
        <Skeleton label="Loading client progress" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24, gap: 12 }}>
        <Notice error title="Could not load progress" message={error} />
        <Action label="Retry" onPress={() => load(period)} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Engagement banner */}
      {data && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent,
          paddingHorizontal: 16, paddingVertical: 8 }}>
          <Ionicons name="calendar-outline" size={15} color={colors.primary} />
          <Copy size="caption" style={{ color: colors.primary, fontWeight: '600' }}>
            {data.daysWithTrainer} day{data.daysWithTrainer !== 1 ? 's' : ''} together · Since {new Date(data.engagementStart).toLocaleDateString()}
          </Copy>
        </View>
      )}

      <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
        <Segmented<Period> label="Period" value={period} onChange={setPeriod}
          options={[
            { value: 'daily', label: 'Today' },
            { value: 'weekly', label: '7 Days' },
            { value: 'monthly', label: '30 Days' },
            { value: '6months', label: '6 Months' },
          ]} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {data && (
          <>
            <SectionCard title="Weight" icon="scale-outline">
              <WeightSection entries={data.weight} />
            </SectionCard>

            <SectionCard title="Nutrition" icon="nutrition-outline">
              <MacroSection scores={data.macroScores} />
            </SectionCard>

            <SectionCard title="Workouts" icon="barbell-outline">
              <WorkoutSection sessions={data.workoutSessions} />
            </SectionCard>

            <SectionCard title="Health Score" icon="heart-outline">
              <HealthScoreSection scores={data.healthScores} />
            </SectionCard>

            <SectionCard title="Steps" icon="footsteps-outline">
              <StepsSection steps={data.steps} />
            </SectionCard>

            <SectionCard title="Sleep" icon="moon-outline">
              <SleepSection sleep={data.sleep} />
            </SectionCard>
          </>
        )}
      </ScrollView>
    </View>
  );
}
