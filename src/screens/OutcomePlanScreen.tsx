import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Action, Card, Copy, Notice, Skeleton } from '../design/components';
import Chip from '../components/Chip';
import EmptyState from '../components/ui-states/EmptyState';
import { useTheme } from '../design/theme';
import { api } from '../api/client';
import { getAssignedTrainer } from '../api/trainers';
import { getActivePlan, OutcomePlan, OutcomeGoal } from '../api/coaching';

const GOAL_TONE = { open: 'Open', met: 'Met', dropped: 'Dropped' } as const;

export default function OutcomePlanScreen() {
  const { colors } = useTheme();
  const [plan, setPlan] = useState<OutcomePlan | null>(null);
  const [coach, setCoach] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [none, setNone] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    let live = true;
    setLoading(true); setError(false); setNone(false);
    (async () => {
      try {
        const a = await getAssignedTrainer();
        const rel = a.assigned;
        if (!rel) { if (live) setNone(true); return; }
        if (live) setCoach(rel.trainer?.displayName ?? null);
        const r = await getActivePlan(rel.id);
        if (live) { setPlan(r.plan); if (!r.plan) setNone(true); }
      } catch { if (live) setError(true); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, []));

  async function setGoalStatus(goal: OutcomeGoal, status: 'open' | 'met' | 'dropped') {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.patch(`/coaching/outcome-plans/goals/${goal.id}`, { status });
      setPlan(p => p && ({ ...p, goals: p.goals.map(g => g.id === goal.id ? r.data.goal : g) }));
    } catch { /* keep prior state */ }
    finally { setBusy(false); }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
      <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Shared plan</Copy>
      {loading && <Skeleton label="Loading your plan" />}
      {error && <Notice error title="Couldn't load your plan" message="Check your connection and try again." />}
      {none && !loading && <EmptyState title="No shared plan yet" description="Once your coach sets up a plan with you, it will appear here." />}
      {plan && !loading && (
        <>
          <Card>
            <Copy size="heading" style={{ fontWeight: '600' }}>{plan.title ?? 'Outcome plan'}</Copy>
            <Copy tone="muted" size="caption">Version {plan.version}{coach ? ` · with ${coach}` : ''}{plan.targetDate ? ` · target ${plan.targetDate.slice(0, 10)}` : ''}</Copy>
            <Copy size="caption" tone="muted">Goals can be qualitative — missing measurements are never treated as failure.</Copy>
          </Card>
          {plan.goals.map((g) => (
            <Card key={g.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Copy style={{ fontWeight: '600', flexShrink: 1 }}>{g.title}</Copy>
                <Chip small label={GOAL_TONE[g.status]} accessibilityLabel={`Goal ${g.title}: ${GOAL_TONE[g.status]}`} />
              </View>
              {!!g.baseline && <Copy size="caption" tone="muted">Started: {g.baseline}</Copy>}
              {!!g.target && <Copy>Target: {g.target}{g.targetDate ? ` by ${g.targetDate.slice(0, 10)}` : ''}</Copy>}
              <Copy size="caption" tone="muted">Review every {g.reviewIntervalDays} days · tracked via {g.progressSource.replace(/_/g, ' ')}</Copy>
              {!!g.notes && <Copy size="caption">{g.notes}</Copy>}
              {g.status === 'open' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Action secondary label="Mark met" disabled={busy} onPress={() => void setGoalStatus(g, 'met')} />
                  <Action secondary label="Drop" disabled={busy} onPress={() => void setGoalStatus(g, 'dropped')} />
                </View>
              )}
              {g.status !== 'open' && <Action secondary label="Reopen" disabled={busy} onPress={() => void setGoalStatus(g, 'open')} />}
            </Card>
          ))}
          {(plan.adjustments?.length ?? 0) > 0 && (
            <Card>
              <Copy size="heading" style={{ fontWeight: '600' }}>Change history</Copy>
              {plan.adjustments!.map((a) => (
                <View key={a.id}><Copy size="caption">{a.summary}</Copy><Copy size="caption" tone="muted">{a.createdAt.slice(0, 10)}</Copy></View>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}
