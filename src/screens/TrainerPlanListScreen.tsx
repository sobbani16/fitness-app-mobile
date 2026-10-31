import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listWorkoutPlans, PlanStatus, TrainerWorkoutPlan } from '../api/trainerPlans';
import { Action, Card, Copy, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Chip from '../components/Chip';
import EmptyState from '../components/ui-states/EmptyState';

const FILTERS: { value: PlanStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

function planMeta(plan: TrainerWorkoutPlan): string {
  const bits: string[] = [];
  if (plan.difficulty) bits.push(plan.difficulty);
  if (plan.durationWeeks) bits.push(`${plan.durationWeeks} wk`);
  if (plan.daysPerWeek) bits.push(`${plan.daysPerWeek} days/wk`);
  const days = plan._count?.days ?? plan.days?.length;
  if (days !== undefined) bits.push(`${days} day${days === 1 ? '' : 's'} planned`);
  const assigned = plan._count?.assignments ?? plan.assignments?.length;
  if (assigned) bits.push(`${assigned} assigned`);
  return bits.join(' · ');
}

export default function TrainerPlanListScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [plans, setPlans] = useState<TrainerWorkoutPlan[]>([]);
  const [filter, setFilter] = useState<PlanStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (status: PlanStatus | '' = filter) => {
    setError(null);
    try {
      const data = await listWorkoutPlans(status || undefined);
      setPlans(data.plans);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Could not load plans.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); void load(); };
  const changeFilter = (status: PlanStatus | '') => {
    setFilter(status);
    setLoading(true);
    void load(status);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={loading ? [] : plans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Workout plans</Copy>
            <Copy tone="muted">Build structured plans, publish them, then assign them to clients.</Copy>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {FILTERS.map((f) => (
                <Chip key={f.label} label={f.label} selected={filter === f.value}
                  accessibilityLabel={`Filter plans: ${f.label}`} onPress={() => changeFilter(f.value)} />
              ))}
            </View>
            <Action label="New workout plan" onPress={() => navigation.navigate('TrainerPlanEditor', {})} />
            {!!error && !loading && (
              <Card><Notice error title="Could not load plans" message={error} /><Action label="Retry" onPress={() => void load()} /></Card>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Skeleton label="Loading workout plans" />
          ) : error ? null : (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState title={filter ? `No ${filter} plans` : 'No workout plans yet'}
                description="Create a draft plan, add days and exercises, then publish it for clients." />
            </View>
          )
        }
        renderItem={({ item }) => (
          <Card style={{ padding: 16, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Copy style={{ fontWeight: '700' }} numberOfLines={2}>{item.title}</Copy>
              </View>
              <Chip small label={item.status} accessibilityLabel={`Status: ${item.status}`} />
            </View>
            <Copy size="caption" tone="muted">Version {item.version}{planMeta(item) ? ` · ${planMeta(item)}` : ''}</Copy>
            {!!item.goal && <Copy size="caption" tone="muted" numberOfLines={2}>Goal: {item.goal}</Copy>}
            <Action secondary label="Open plan"
              onPress={() => navigation.navigate('TrainerPlanEditor', { planId: item.id })} />
          </Card>
        )}
      />
    </View>
  );
}
