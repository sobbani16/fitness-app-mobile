import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Button,
  Pressable,
  Alert,
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
import { useSupplementCatalog } from '../hooks/useSupplementCatalog';
import { Supplement } from '../api/supplements';
import { GLASS_ML } from '../storage/dailyStats';
import { formatWeight } from '../util/units';
import { useNavigation } from '@react-navigation/native';
import HealthScoreCard from '../components/HealthScoreCard';

const WATER_GOAL_ML = 2000;

// Rough kcal burned per step, scaled by body weight (≈0.04 kcal/step at 70kg).
function caloriesFromSteps(steps: number, weightKg: number): number {
  const perStep = 0.04 * (weightKg / 70);
  return Math.round(steps * perStep);
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { profile } = useProfile();
  const { totalCalories, meals, refresh: refreshMeals } = useMeals();
  const { weather, refresh: refreshWeather } = useWeather();
  const { steps, available: stepsAvailable } = useStepCounter();
  const { stats, addWater, toggleSupplement, refresh: refreshStats } = useDailyStats();
  const {
    mySupplements,
    searchResults,
    searching: supplementSearching,
    refresh: refreshSupplements,
    search: searchSupplementCatalog,
    select: selectSupplement,
    deselect: deselectSupplement,
  } = useSupplementCatalog();
  const [supplementQuery, setSupplementQuery] = useState('');
  const [supplementQty, setSupplementQty] = useState<Record<string, number>>({});
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
    await Promise.all([refreshMeals(), refreshWeather(), refreshStats(), refreshSupplements()]);
    await load();
  };

  // Supplement macros: sum nutrition from all taken supplements × quantity.
  const supplementMacros = mySupplements.reduce(
    (acc, s) => {
      if (stats?.supplements?.[s.name]) {
        const qty = supplementQty[s.id] || 1;
        acc.calories += (s.calories || 0) * qty;
        acc.proteinG += (s.proteinG || 0) * qty;
        acc.carbsG += (s.carbsG || 0) * qty;
        acc.fatG += (s.fatG || 0) * qty;
        acc.fiberG += (s.fiberG || 0) * qty;
      }
      return acc;
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );

  const onSupplementSearch = (text: string) => {
    setSupplementQuery(text);
    searchSupplementCatalog(text);
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

  // Daily goal message — the first thing the user sees
  const dailyGoalMessage = (() => {
    if (balance.surplus > 200) {
      return `🔥 You need to burn ${balance.surplus} kcal to stay on track today.`;
    }
    if (balance.net < balance.target * 0.5 && meals.length < 2) {
      return `🍽️ You've only eaten ${balance.caloriesIn} kcal — eat a balanced meal to fuel your day.`;
    }
    if (balance.status === 'deficit') {
      return `✅ You're ${Math.abs(balance.surplus)} kcal under target. Stay consistent!`;
    }
    if (balance.status === 'on_target') {
      return `🎯 Right on track! Keep up the good work.`;
    }
    return `💪 Today's goal: ${balance.target} kcal · ${goal.replace(/_/g, ' ')}`;
  })();

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Daily goal banner */}
      <View style={styles.goalBanner}>
        <Text style={styles.goalText}>{dailyGoalMessage}</Text>
      </View>

      <Text style={styles.title}>Hi{profile?.name ? `, ${profile.name}` : ''}</Text>
      <Text style={styles.muted}>
        Goal: {goal.replace(/_/g, ' ')} · Activity: {data.activityLevel.replace('_', ' ')} · {meals.length} meal{meals.length === 1 ? '' : 's'} today
      </Text>
      {weather && (
        <Text style={styles.muted}>
          Weather: {weather.condition} · {weather.description}
          {weather.tempC !== null ? ` · ${Math.round(weather.tempC)}°C` : ''}
        </Text>
      )}

      <HealthScoreCard />

      {/* Weekly Meal Plan link */}
      <Pressable style={styles.weeklyPlanLink} onPress={() => navigation.navigate('WeeklyPlan')}>
        <Text style={styles.weeklyPlanIcon}>🍽️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.weeklyPlanTitle}>Weekly Meal Plan</Text>
          <Text style={styles.weeklyPlanSub}>View your 7-day plan, shopping list & meal prep</Text>
        </View>
        <Text style={styles.weeklyPlanArrow}>›</Text>
      </Pressable>

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
        <Row label="Food" value={`${balance.caloriesIn} kcal`} />
        {supplementMacros.calories > 0 && (
          <Row label="Supplements" value={`${supplementMacros.calories} kcal`} />
        )}
        <Row label="Total consumed" value={`${balance.caloriesIn + supplementMacros.calories} kcal`} valueStyle={{ fontWeight: '700' }} />
        <Row label="Spent (steps + activity)" value={`${balance.caloriesBurnedExercise} kcal`} />
        <Row label="Target" value={`${balance.target} kcal`} />
        <View style={styles.divider} />
        <Row
          label="Balance"
          value={`${balance.surplus > 0 ? '+' : ''}${balance.surplus + supplementMacros.calories} kcal (${balance.status.replace('_', ' ')})`}
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

        {/* User's selected supplements */}
        {mySupplements.length === 0 && !supplementQuery && (
          <Text style={styles.muted}>No supplements selected. Search below to add some.</Text>
        )}
        {mySupplements.map((s) => {
          const taken = Boolean(stats?.supplements?.[s.name]);
          const qty = supplementQty[s.id] || 1;
          return (
            <View key={s.id}>
              <Pressable
                style={styles.supplementRow}
                onPress={() => toggleSupplement(s.name)}
                onLongPress={() =>
                  Alert.alert('Remove supplement?', `Remove "${s.name}" from your list?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => deselectSupplement(s.id) },
                  ])
                }
              >
                <View style={[styles.checkbox, taken && styles.checkboxOn]}>
                  {taken && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.supplementName, taken && styles.supplementNameOn]}>
                    {s.name}
                  </Text>
                  <Text style={styles.supplementDose}>
                    {[s.brand, s.defaultDose].filter(Boolean).join(' · ') || ''}
                  </Text>
                </View>
                {taken && (s.calories > 0 || s.proteinG > 0) && (
                  <Text style={styles.supplementMacro}>
                    {Math.round((s.calories || 0) * qty)} kcal
                  </Text>
                )}
              </Pressable>
              {/* Quantity adjuster — shown when supplement is taken */}
              {taken && (
                <View style={styles.qtyRow}>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => setSupplementQty((prev) => ({ ...prev, [s.id]: Math.max(0.5, (prev[s.id] || 1) - 0.5) }))}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.qtyValue}>
                    {qty} {qty === 1 ? 'serving' : 'servings'}
                  </Text>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => setSupplementQty((prev) => ({ ...prev, [s.id]: (prev[s.id] || 1) + 0.5 }))}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        {/* Supplement macros summary (if any taken have macros) */}
        {supplementMacros.calories > 0 && (
          <View style={styles.supplementMacroSummary}>
            <Text style={styles.muted}>
              Supps today: {supplementMacros.calories} kcal · {supplementMacros.proteinG}g P · {supplementMacros.carbsG}g C · {supplementMacros.fatG}g F
            </Text>
          </View>
        )}

        {/* Search bar for adding supplements */}
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={supplementQuery}
            onChangeText={onSupplementSearch}
            placeholder="Search supplements to add…"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {supplementSearching && <ActivityIndicator style={{ marginLeft: 8 }} />}
        </View>

        {/* Search results */}
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults
              .filter((s) => !mySupplements.some((m) => m.id === s.id))
              .map((s) => (
                <Pressable
                  key={s.id}
                  style={styles.supplementRow}
                  onPress={() => {
                    selectSupplement(s);
                    setSupplementQuery('');
                  }}
                >
                  <View style={styles.checkbox}>
                    <Text style={{ color: '#b0b3bb', fontSize: 16 }}>+</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.supplementName}>{s.name}</Text>
                    <Text style={styles.supplementDose}>
                      {[s.brand, s.category, s.defaultDose].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </Pressable>
              ))}
          </View>
        )}
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
            value={`${formatWeight(
              Math.abs(Math.round((profile.weightKg - profile.goalWeightKg) * 10) / 10),
              profile.units,
            )} ${
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
  goalBanner: {
    backgroundColor: '#eef4fb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#c5ddf5',
  },
  goalText: { fontSize: 15, fontWeight: '600', color: '#1a4a7a', lineHeight: 22 },
  weeklyPlanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  weeklyPlanIcon: { fontSize: 24 },
  weeklyPlanTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  weeklyPlanSub: { fontSize: 12, color: '#888' },
  weeklyPlanArrow: { fontSize: 24, color: '#ccc' },
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
  supplementDose: { fontSize: 12, color: '#888' },
  supplementMacro: { fontSize: 12, color: '#1e6fb8', fontWeight: '600' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 34, paddingVertical: 4 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e5e5ea', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: '#444' },
  qtyValue: { fontSize: 13, fontWeight: '600', color: '#333', minWidth: 80, textAlign: 'center' },
  supplementMacroSummary: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#e5e5ea' },
  searchResults: { marginTop: 4, borderTopWidth: 1, borderTopColor: '#e5e5ea', paddingTop: 4 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d0d0d5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  addBtn: {
    backgroundColor: '#1e6fb8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addBtnDisabled: { backgroundColor: '#a9c4dd' },
  addBtnText: { color: '#fff', fontWeight: '700' },
});
