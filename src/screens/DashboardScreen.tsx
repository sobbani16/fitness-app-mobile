import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Button,
  Pressable,
} from 'react-native';
import {
  getRecommendations,
  RecommendationResponse,
} from '../api/recommendations';
import { useProfile } from '../context/ProfileContext';
import { useMeals } from '../context/MealsContext';
import { useWeather } from '../hooks/useWeather';
import { useStepCounter } from '../hooks/useStepCounter';
import { useDailyStats } from '../hooks/useDailyStats';
import { DEFAULT_SUPPLEMENTS, GLASS_ML } from '../storage/dailyStats';
import { formatWeight } from '../util/units';

const WATER_GOAL_ML = 2000;

// Rough kcal burned per step, scaled by body weight (≈0.04 kcal/step at 70kg).
function caloriesFromSteps(steps: number, weightKg: number): number {
  const perStep = 0.04 * (weightKg / 70);
  return Math.round(steps * perStep);
}

export default function DashboardScreen() {
  const { profile } = useProfile();
  const { totalCalories, meals, refresh: refreshMeals } = useMeals();
  const { weather, refresh: refreshWeather } = useWeather();
  const { steps, available: stepsAvailable } = useStepCounter();
  const { stats, addWater, toggleSupplement, refresh: refreshStats } = useDailyStats();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stepCalories = profile ? caloriesFromSteps(steps, profile.weightKg) : 0;

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setError(null);
      const res = await getRecommendations({
        sex: profile.sex,
        age: profile.age,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        activityLevel: profile.activityLevel,
        goal: profile.goal,
        caloriesIn: totalCalories,
        caloriesBurnedExercise: caloriesFromSteps(steps, profile.weightKg),
        weather: weather?.condition,
      });
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? 'Request failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile, totalCalories, weather, steps]);

  useEffect(() => {
    if (profile) load();
  }, [load, profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshMeals(), refreshWeather(), refreshStats()]);
    await load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading dashboard…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>Error: {error ?? 'no data'}</Text>
        <Button title="Retry" onPress={load} />
      </View>
    );
  }

  const { balance, recommendation, goal } = data;
  const statusColor =
    balance.status === 'surplus' ? '#b85c00' : balance.status === 'deficit' ? '#1e6fb8' : '#2e7d32';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Hi{profile?.name ? `, ${profile.name}` : ''}</Text>
      <Text style={styles.muted}>
        Goal: {goal} · Activity: {data.activityLevel.replace('_', ' ')} · {meals.length} meal{meals.length === 1 ? '' : 's'} today
      </Text>
      {weather && (
        <Text style={styles.muted}>
          Weather: {weather.condition} · {weather.description}
          {weather.tempC !== null ? ` · ${Math.round(weather.tempC)}°C` : ''}
        </Text>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Steps</Text>
        <View style={styles.bigStatRow}>
          <Text style={styles.bigStat}>{steps.toLocaleString()}</Text>
          <Text style={styles.bigStatUnit}>steps today</Text>
        </View>
        <Row label="Calories burned (steps)" value={`${stepCalories} kcal`} />
        {!stepsAvailable && (
          <Text style={styles.muted}>
            Step sensor unavailable in this build. Counts appear on a device with motion access.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's calories</Text>
        <Row label="Consumed" value={`${balance.caloriesIn} kcal`} />
        <Row label="Spent (steps + activity)" value={`${balance.caloriesBurnedExercise} kcal`} />
        <Row label="Target" value={`${balance.target} kcal`} />
        <Row label="Net" value={`${balance.net} kcal`} />
        <View style={styles.divider} />
        <Row
          label="Balance"
          value={`${balance.surplus > 0 ? '+' : ''}${balance.surplus} kcal (${balance.status.replace('_', ' ')})`}
          valueStyle={{ color: statusColor, fontWeight: '700' }}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Water intake</Text>
          <Text style={styles.muted}>
            {(stats?.waterMl ?? 0)} / {WATER_GOAL_ML} ml
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, ((stats?.waterMl ?? 0) / WATER_GOAL_ML) * 100)}%` },
            ]}
          />
        </View>
        <View style={styles.waterRow}>
          <Pressable style={styles.waterBtn} onPress={() => addWater(-GLASS_ML)}>
            <Text style={styles.waterBtnText}>− glass</Text>
          </Pressable>
          <Text style={styles.waterGlasses}>
            {Math.round((stats?.waterMl ?? 0) / GLASS_ML)} glasses
          </Text>
          <Pressable
            style={[styles.waterBtn, styles.waterBtnPrimary]}
            onPress={() => addWater(GLASS_ML)}
          >
            <Text style={[styles.waterBtnText, styles.waterBtnPrimaryText]}>+ glass</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Supplements</Text>
        {DEFAULT_SUPPLEMENTS.map((name) => {
          const taken = Boolean(stats?.supplements?.[name]);
          return (
            <Pressable
              key={name}
              style={styles.supplementRow}
              onPress={() => toggleSupplement(name)}
            >
              <View style={[styles.checkbox, taken && styles.checkboxOn]}>
                {taken && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.supplementName, taken && styles.supplementNameOn]}>{name}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weight goal</Text>
        <Row label="Current" value={profile ? formatWeight(profile.weightKg, profile.units) : '—'} />
        <Row
          label="Goal"
          value={
            profile?.goalWeightKg != null
              ? formatWeight(profile.goalWeightKg, profile.units)
              : 'Set in Edit profile'
          }
        />
        {profile?.goalWeightKg != null && (
          <Row
            label="To go"
            value={`${Math.abs(Math.round((profile.weightKg - profile.goalWeightKg) * 10) / 10)} kg ${
              profile.weightKg > profile.goalWeightKg ? 'to lose' : profile.weightKg < profile.goalWeightKg ? 'to gain' : '— at goal'
            }`}
            valueStyle={{ fontWeight: '700', color: '#1e6fb8' }}
          />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Next action</Text>
        <Text style={styles.recoTitle}>{recommendation.title}</Text>
        <Text style={styles.muted}>
          {recommendation.type} · {recommendation.intensity} · {recommendation.durationMin} min · {recommendation.location}
        </Text>
        <Text style={styles.reason}>{recommendation.reason}</Text>
      </View>

      <Button title="Refresh" onPress={load} />
    </ScrollView>
  );
}

function Row({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: any;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 10 },
  title: { fontSize: 24, fontWeight: '700' },
  muted: { color: '#666' },
  err: { color: '#c0392b', fontWeight: '600' },
  card: {
    backgroundColor: '#f7f7f9',
    borderRadius: 12,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  rowLabel: { color: '#444' },
  rowValue: { color: '#111' },
  divider: { height: 1, backgroundColor: '#e5e5ea', marginVertical: 6 },
  recoTitle: { fontSize: 18, fontWeight: '600', marginTop: 4 },
  reason: { marginTop: 6, color: '#333', lineHeight: 20 },
  bigStatRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginVertical: 4 },
  bigStat: { fontSize: 36, fontWeight: '800', color: '#111' },
  bigStatUnit: { fontSize: 14, color: '#666' },
  progressTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: '#e5e5ea',
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressFill: { height: '100%', backgroundColor: '#1e6fb8', borderRadius: 6 },
  waterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waterBtn: {
    borderWidth: 1,
    borderColor: '#1e6fb8',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  waterBtnPrimary: { backgroundColor: '#1e6fb8' },
  waterBtnText: { color: '#1e6fb8', fontWeight: '700' },
  waterBtnPrimaryText: { color: '#fff' },
  waterGlasses: { color: '#333', fontWeight: '600' },
  supplementRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#b0b3bb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  checkmark: { color: '#fff', fontWeight: '900', fontSize: 14 },
  supplementName: { fontSize: 15, color: '#222' },
  supplementNameOn: { color: '#2e7d32', fontWeight: '600' },
});
