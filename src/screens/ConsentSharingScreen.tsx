import React, { useEffect, useState, useCallback } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  CONSENT_CATEGORIES,
  ConsentCategory,
  endRelationship,
  getRelationshipConsents,
  updateRelationshipConsents,
} from '../api/trainerRequests';
import { backOrFallback } from '../navigation/back';
import { Action, Card, Copy, Notice, Skeleton } from '../design/components';
import { radius, useTheme } from '../design/theme';
import Toggle from '../components/Toggle';

// Route registered by the navigator owner; params typed locally so this file
// compiles independently of RootStackParamList wiring.
type ConsentRoute = RouteProp<{ ConsentSharing: { relationId: string } }, 'ConsentSharing'>;

const DESCRIPTIONS: Record<ConsentCategory, { label: string; hint: string }> = {
  workout_records: { label: 'Workout records', hint: 'Your trainer sees your logged sessions' },
  food_logs: { label: 'Food logs', hint: 'Your trainer sees the meals you log' },
  nutrition_summaries: { label: 'Nutrition summaries', hint: 'Your trainer sees daily calorie and macro totals' },
  weight_trends: { label: 'Weight trends', hint: 'Your trainer sees weigh-ins and trend lines' },
  sleep_summaries: { label: 'Sleep summaries', hint: 'Your trainer sees nightly sleep duration and quality' },
  step_counts: { label: 'Step counts', hint: 'Your trainer sees your daily steps' },
  body_measurements: { label: 'Body measurements', hint: 'Your trainer sees tape measurements you record' },
  health_scores: { label: 'Health scores', hint: 'Your trainer sees your daily health score' },
};

const GRANTED = 'granted';

export default function ConsentSharingScreen() {
  const route = useRoute<ConsentRoute>();
  const nav = useNavigation();
  const { colors } = useTheme();
  const { relationId } = route.params;

  const [statuses, setStatuses] = useState<Partial<Record<ConsentCategory, string>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const consents = await getRelationshipConsents(relationId);
      const map: Partial<Record<ConsentCategory, string>> = {};
      for (const c of consents) map[c.category as ConsentCategory] = c.status;
      setStatuses(map);
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message);
    } finally {
      setLoading(false);
    }
  }, [relationId]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (category: ConsentCategory, on: boolean) => {
    const previous = statuses[category];
    setStatuses((prev) => ({ ...prev, [category]: on ? GRANTED : 'revoked' }));
    try {
      await updateRelationshipConsents(relationId, {
        grants: on ? [category] : [],
        revokes: on ? [] : [category],
      });
    } catch (e: any) {
      // Optimistic update failed — restore the server truth.
      setStatuses((prev) => ({ ...prev, [category]: previous }));
      Alert.alert('Could not update sharing', e.response?.data?.error ?? e.message);
    }
  };

  const confirmEnd = () => {
    Alert.alert(
      'End coaching relationship?',
      'Your trainer will lose access to your shared data and you will need a new request to work together again.',
      [
        { text: 'Keep coaching', style: 'cancel' },
        {
          text: 'End relationship',
          style: 'destructive',
          onPress: async () => {
            setEnding(true);
            try {
              await endRelationship(relationId);
              backOrFallback(nav, 'Summary');
            } catch (e: any) {
              Alert.alert('Could not end relationship', e.response?.data?.error ?? e.message);
            } finally {
              setEnding(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, gap: 16 }}>
        <Skeleton label="Loading sharing settings" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24, gap: 12 }}>
        <Notice error title="Could not load sharing settings" message={error} />
        <Action label="Retry" onPress={load} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 16 }}>
      <Card>
        <Notice title="Your data, your choice"
          message="You control exactly what your trainer can see. Changes apply immediately, and you can update them anytime." />
      </Card>

      <Card style={{ gap: 16 }}>
        {CONSENT_CATEGORIES.map((category) => (
          <Toggle
            key={category}
            label={DESCRIPTIONS[category].label}
            hint={DESCRIPTIONS[category].hint}
            value={statuses[category] === GRANTED}
            onChange={(v) => toggle(category, v)}
          />
        ))}
      </Card>

      <Copy size="caption" tone="muted">
        Turning a category off stops new sharing right away. Data your trainer already saw is not deleted from their view history.
      </Copy>

      <Pressable
        accessibilityRole="button" accessibilityLabel="End coaching relationship" accessibilityState={{ disabled: ending }}
        disabled={ending} onPress={confirmEnd}
        style={({ pressed }) => ({
          minHeight: 48, borderRadius: radius.control, padding: 12, justifyContent: 'center',
          alignItems: 'center', borderWidth: 1.5, borderColor: colors.danger,
          opacity: ending ? 0.55 : pressed ? 0.7 : 1,
        })}
      >
        <Copy tone="danger" style={{ fontWeight: '600' }}>{ending ? 'Ending…' : 'End coaching relationship'}</Copy>
      </Pressable>
    </ScrollView>
  );
}
