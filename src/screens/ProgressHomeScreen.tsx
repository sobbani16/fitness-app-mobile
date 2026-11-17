import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Action, Card, Copy, Notice, Progress, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { getTodayProgress, getProgressOpportunities, getStreak, getProgressWeek, DailyProgress, ProgressOpportunity, StreakInfo, ProgressWeek } from '../api/dailyProgress';
import ScoreRing from '../components/ScoreRing';
import LeoCalendarScreen from './LeoCalendarScreen';

const SEGMENTS = ['Today', 'Week', 'Month'] as const;
type Segment = typeof SEGMENTS[number];
const DAY_LABEL = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Unified Progress tab — one screen, three segments (P0). Selected segment
// persists across detail navigation because state lives on the tab screen.
export default function ProgressHomeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [seg, setSeg] = useState<Segment>('Today');
  const [today, setToday] = useState<DailyProgress | null>(null);
  const [opps, setOpps] = useState<ProgressOpportunity[]>([]);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [week, setWeek] = useState<ProgressWeek | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const [t, o, s, w] = await Promise.allSettled([getTodayProgress(), getProgressOpportunities(), getStreak(), getProgressWeek()]);
    if (t.status === 'fulfilled') setToday(t.value);
    if (o.status === 'fulfilled') setOpps(o.value.top);
    if (s.status === 'fulfilled') setStreak(s.value);
    if (w.status === 'fulfilled') setWeek(w.value);
    if (t.status === 'rejected' && w.status === 'rejected') setError('Progress could not load. Try again when connected.');
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ flexDirection: 'row', margin: 16, marginBottom: 8, backgroundColor: colors.accent, borderRadius: 10, padding: 3 }}>
      {SEGMENTS.map(s => (
        <View key={s} style={{ flex: 1 }}>
          <Action secondary={seg !== s} label={s} selected={seg === s} onPress={() => setSeg(s)} />
        </View>
      ))}
    </View>
    {!!error && <View style={{ paddingHorizontal: 16 }}><Notice error title="Please review" message={error} /></View>}

    {seg === 'Today' && <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingTop: 4 }}>
      {loading && !today ? <Skeleton label="Loading today's progress" /> : today && <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ScoreRing score={today.earned} size={72} />
          <View style={{ flex: 1 }}>
            <Copy size="heading">{Math.round(today.earned)} / {today.applicable}</Copy>
            <Copy size="caption" tone="muted">{streak?.explanation || 'Daily progress toward your plan'}</Copy>
            {streak && <Copy size="caption" tone="muted">{streak.current > 0 ? `${streak.current}-day run · ` : ''}{streak.todayQualified ? 'Today qualified' : 'Today not yet qualified'}</Copy>}
          </View>
        </View>
      </Card>}
      {opps.slice(0, 3).map(o => <Card key={o.id}>
        <Copy>{o.title}</Copy>
        <Copy size="caption" tone="muted">Up to +{o.projectedPoints} progress points · {o.explanation}</Copy>
        <Action secondary label="Open" onPress={() => navigation.navigate('DailyProgressDetail')} />
      </Card>)}
      <Action secondary label="Full daily breakdown" onPress={() => navigation.navigate('DailyProgressDetail')} />
    </ScrollView>}

    {seg === 'Week' && <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingTop: 4 }}>
      {loading && !week ? <Skeleton label="Loading week" /> : week && <>
        <Card>
          <Copy size="heading">This week</Copy>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {week.days.map(d => {
              const h = Math.max(6, Math.min(60, (d.earned ?? 0) * 0.6));
              return <View key={d.dayKey} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                <View style={{ height: 60, justifyContent: 'flex-end', width: '100%' }}>
                  <View style={{ height: h, borderRadius: 4, backgroundColor: d.color === 'GREEN' ? colors.primary : d.color === 'YELLOW' ? '#C9A227' : d.color === 'RED' ? '#B4474D' : colors.track }} />
                </View>
                <Copy size="caption" tone={d.isToday ? undefined : 'muted'}>{DAY_LABEL[d.weekday]}</Copy>
                <Copy size="caption" tone="muted">{d.earned ?? '–'}{d.target ? `/${d.target}` : ''}</Copy>
              </View>;
            })}
          </View>
        </Card>
        <Card>
          <Copy>Earned {week.summary.earned} / target-to-date {week.summary.targetToDate} · week target {week.summary.target}</Copy>
          <Copy size="caption" tone="muted">Average {week.summary.average ?? '—'} · {week.summary.daysMetTarget} days met target · {week.summary.recorded}/7 recorded</Copy>
          <Copy size="caption" tone="muted">Last week avg {week.lastWeek.summary.average ?? '—'}{week.comparison.deltaAvg != null ? ` · ${week.comparison.deltaAvg > 0 ? '+' : ''}${week.comparison.deltaAvg}/day` : ''}. {week.comparison.note}</Copy>
        </Card>
      </>}
    </ScrollView>}

    {seg === 'Month' && <LeoCalendarScreen />}
  </View>;
}
