import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listMyWorkoutPlans, respondToWorkoutPlan, WorkoutPlanAssignment } from '../api/trainerPlans';
import { Action, Card, Copy, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Chip from '../components/Chip';
import EmptyState from '../components/ui-states/EmptyState';

function planSummary(a: WorkoutPlanAssignment): string {
  const p = a.plan;
  if (!p) return '';
  const bits: string[] = [];
  if (p.trainer?.displayName) bits.push(`Coach ${p.trainer.displayName}`);
  if (p.difficulty) bits.push(p.difficulty);
  if (p.durationWeeks) bits.push(`${p.durationWeeks} wk`);
  if (p.daysPerWeek) bits.push(`${p.daysPerWeek} days/wk`);
  return bits.join(' · ');
}

export default function ClientPlansScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [assignments, setAssignments] = useState<WorkoutPlanAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listMyWorkoutPlans();
      setAssignments(data.assignments);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Could not load plans.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const respond = async (a: WorkoutPlanAssignment, action: 'accept' | 'decline') => {
    setResponding(a.id);
    try {
      await respondToWorkoutPlan(a.id, action);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'The response could not be sent.');
    } finally {
      setResponding(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={loading ? [] : assignments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 4 }}>
            <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>My workout plans</Copy>
            <Copy tone="muted">Plans your coach assigns show up here. Accept one to start training against it.</Copy>
            {!!error && <Card><Notice error title="Something went wrong" message={error} /><Action label="Retry" onPress={() => void load()} /></Card>}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Skeleton label="Loading your plans" />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState title="No plans assigned" description="When your coach publishes a plan for you it will appear here." />
            </View>
          )
        }
        renderItem={({ item }) => (
          <Card style={{ padding: 16, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Copy style={{ fontWeight: '700' }} numberOfLines={2}>{item.plan?.title || 'Workout plan'}</Copy>
              </View>
              <Chip small label={item.status} accessibilityLabel={`Status: ${item.status}`} />
            </View>
            {!!planSummary(item) && <Copy size="caption" tone="muted">{planSummary(item)}</Copy>}
            <Copy size="caption" tone="muted">Assigned {new Date(item.assignedAt).toLocaleDateString()}</Copy>
            {item.status === 'assigned' && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Action label={responding === item.id ? 'Sending…' : 'Accept'} disabled={responding !== null} onPress={() => void respond(item, 'accept')} />
                </View>
                <View style={{ flex: 1 }}>
                  <Action secondary label="Decline" disabled={responding !== null} onPress={() => void respond(item, 'decline')} />
                </View>
              </View>
            )}
            <Action secondary label={`View plan: ${item.plan?.title || 'workout plan'}`}
              onPress={() => navigation.navigate('ClientPlanDetail', { assignmentId: item.id })} />
          </Card>
        )}
      />
    </View>
  );
}
