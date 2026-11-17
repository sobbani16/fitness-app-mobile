import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Action, Card, Copy, Notice, Progress, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { getTodayProgress, getProgressHistory, DailyProgress } from '../api/dailyProgress';
import ScoreRing from '../components/ScoreRing';
import { getSession } from '../storage/session';

const STATUS_LABEL: Record<string, string> = {
  GOAL_MET: 'Done',
  IN_PROGRESS: 'In progress',
  NOT_STARTED: 'Not started yet',
  INSUFFICIENT_DATA: 'Not logged yet',
  NOT_APPLICABLE: 'Not part of your plan',
};
const COMPONENT_LABEL: Record<string, string> = {
  nutrition: 'Nutrition', hydration: 'Hydration', activity: 'Activity & recovery',
  sleep: "Last night's sleep", habits: 'Your habits', planActions: 'Plan actions',
};

// A2/A10/A11: V2 "Daily Goal Progress" — what of my planned day is done.
// Explicitly NOT a health measurement; the legacy Health Score stays separate.
export default function DailyProgressScreen() {
  const { colors } = useTheme();
  const [progress, setProgress] = useState<DailyProgress | null>(null);
  const [history, setHistory] = useState<{ dayKey: string; earned: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);

  useFocusEffect(useCallback(() => {
    const token = ++generation.current, account = getSession()?.user.id;
    setLoading(true); setError('');
    Promise.allSettled([getTodayProgress(), getProgressHistory(14)]).then(([cur, hist]) => {
      if (token !== generation.current || account !== getSession()?.user.id) return;
      if (cur.status === 'fulfilled') setProgress(cur.value); else setProgress(null);
      if (hist.status === 'fulfilled') setHistory(hist.value); else setHistory([]);
      if (cur.status === 'rejected') setError('Daily progress could not load. Try again when connected.');
      setLoading(false);
    });
    return () => { generation.current++; };
  }, []));

  if (loading && !progress) return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20 }}><Skeleton label="Loading daily progress" /></ScrollView>;

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
    <Copy size="title" accessibilityRole="header">Today&apos;s progress</Copy>
    <Copy size="caption" tone="muted">How much of your planned day is done — not a health measurement. Updated {progress ? new Date(progress.computedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}.</Copy>
    {!!error && <Notice error title="Please review" message={error} />}

    {progress && <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <ScoreRing score={progress.earned} size={72} />
        <View style={{ flex: 1 }}>
          <Copy size="heading">{Math.round(progress.earned)} of {progress.applicable} points</Copy>
          {progress.nextAction && <Copy size="caption" tone="muted">Next up: {progress.nextAction.note || progress.nextAction.component}</Copy>}
          {!progress.nextAction && <Copy size="caption" tone="muted">Everything planned for today is done.</Copy>}
        </View>
      </View>
    </Card>}

    {progress?.components.map(c => <Card key={c.key}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Copy>{COMPONENT_LABEL[c.key] || c.key}</Copy>
        <Copy size="caption" tone={c.status === 'GOAL_MET' ? 'primary' : 'muted'}>{STATUS_LABEL[c.status] || c.status}</Copy>
      </View>
      {c.status !== 'NOT_APPLICABLE' && <Progress label={`${Math.round(c.earned)} of ${Math.round(c.applicable)} points`} value={c.earned} target={c.applicable} />}
      {!!c.note && <Copy size="caption" tone="muted">{c.note}</Copy>}
    </Card>)}

    {!!history.length && <Card>
      <Copy size="heading">Last {history.length} days</Copy>
      {history.slice(0, 14).map(d => <View key={d.dayKey} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Copy size="caption" tone="muted">{d.dayKey}</Copy>
        <Copy size="caption">{Math.round(d.earned)} pts</Copy>
      </View>)}
      <Copy size="caption" tone="muted">Version {progress?.version ?? 2} scoring — not comparable with the legacy Health Score.</Copy>
    </Card>}
  </ScrollView>;
}
