import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useProfile } from '../context/ProfileContext';
import { useMeals } from '../context/MealsContext';
import { useWeather } from '../hooks/useWeather';
import { getDailySummary, DailySummaryResponse } from '../api/summary';
import { formatHeight, formatWeight } from '../util/units';
import { UnitSystem } from '../storage/profile';

export default function SummaryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, reset, update } = useProfile();
  const { meals, refresh: refreshMeals } = useMeals();
  const { weather, refresh: refreshWeather } = useWeather();

  const [summary, setSummary] = useState<DailySummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    try {
      const res = await getDailySummary({
        profile: {
          sex: profile.sex,
          weightKg: profile.weightKg,
          heightCm: profile.heightCm,
          age: profile.age,
          activityLevel: profile.activityLevel,
          goal: profile.goal,
        },
        meals: meals.map((m) => ({ name: m.name, calories: m.calories, mealType: m.mealType })),
        weather: weather ? { condition: weather.condition } : undefined,
      });
      setSummary(res);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load summary');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile, meals, weather]);

  useEffect(() => {
    if (profile) load();
  }, [load, profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshMeals(), refreshWeather()]);
    await load();
  };

  const onEdit = () => navigation.navigate('EditProfile');

  const onDelete = () =>
    Alert.alert(
      'Delete profile?',
      'This permanently removes your saved profile and returns you to setup.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => reset() },
      ],
    );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const statusColor =
    summary?.balance.status === 'surplus' ? '#b85c00'
    : summary?.balance.status === 'deficit' ? '#1e6fb8'
    : '#2e7d32';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Daily Summary</Text>

      {error && <Text style={styles.err}>{error}</Text>}

      {summary && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Insight</Text>
            <Text style={styles.insight}>{summary.insight}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Calories</Text>
            <Row label="BMR" value={`${summary.bmr} kcal`} />
            <Row label="TDEE" value={`${summary.tdee} kcal`} />
            <Row label="Target" value={`${summary.balance.target} kcal`} />
            <Row label="Consumed" value={`${summary.balance.caloriesIn} kcal`} />
            <Row label="Net" value={`${summary.balance.net} kcal`} />
            <Row
              label="Balance"
              value={`${summary.balance.surplus > 0 ? '+' : ''}${summary.balance.surplus} kcal (${summary.balance.status.replace('_', ' ')})`}
              valueStyle={{ color: statusColor, fontWeight: '700' }}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Next action</Text>
            <Text style={styles.recoTitle}>{summary.recommendation.title}</Text>
            <Text style={styles.muted}>
              {summary.recommendation.type} · {summary.recommendation.intensity} · {summary.recommendation.durationMin} min · {summary.recommendation.location}
            </Text>
            <Text style={styles.reason}>{summary.recommendation.reason}</Text>
          </View>
        </>
      )}

      {profile && (
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.cardTitle}>Your profile</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['metric', 'imperial'] as UnitSystem[]).map((u) => {
                const active = profile.units === u;
                return (
                  <Pressable
                    key={u}
                    onPress={() => update({ units: u })}
                    style={[styles.unitChip, active && styles.unitChipActive]}
                  >
                    <Text style={[styles.unitChipText, active && styles.unitChipTextActive]}>
                      {u === 'metric' ? 'kg/cm' : 'lb/ft'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Text>Name: {profile.name}</Text>
          <Text>{profile.sex} · {profile.age} yrs</Text>
          <Text>
            {formatHeight(profile.heightCm, profile.units)} · {formatWeight(profile.weightKg, profile.units)}
          </Text>
          <Text>Activity: {profile.activityLevel.replace('_', ' ')}</Text>
          <Text>Goal: {profile.goal}</Text>
        </View>
      )}

      {/* Trainer section */}
      <TouchableOpacity
        style={styles.trainerCard}
        onPress={() => navigation.navigate('TrainerList')}
        activeOpacity={0.85}
      >
        <View style={styles.trainerCardLeft}>
          <Ionicons name="barbell-outline" size={24} color="#1e6fb8" />
        </View>
        <View style={styles.trainerCardBody}>
          <Text style={styles.trainerCardTitle}>Find a Trainer</Text>
          <Text style={styles.trainerCardSub}>Browse Standard, Pro &amp; Elite coaches</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#ccc" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.becomeTrainerBtn}
        onPress={() => navigation.navigate('TrainerSignup')}
        activeOpacity={0.85}
      >
        <Ionicons name="ribbon-outline" size={16} color="#5c8a5c" />
        <Text style={styles.becomeTrainerText}>Become a Trainer</Text>
      </TouchableOpacity>

      <View style={{ height: 12 }} />
      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, styles.editBtn]} onPress={onEdit}>
          <Text style={styles.editBtnText}>Edit profile</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
          <Text style={styles.deleteBtnText}>Delete profile</Text>
        </Pressable>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function Row({ label, value, valueStyle }: { label: string; value: string; valueStyle?: any }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700' },
  muted: { color: '#666' },
  err: { color: '#c0392b' },
  card: {
    backgroundColor: '#f7f7f9',
    borderRadius: 12,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  insight: { color: '#222', lineHeight: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  rowLabel: { color: '#444' },
  rowValue: { color: '#111' },
  recoTitle: { fontSize: 18, fontWeight: '600', marginTop: 4 },
  reason: { marginTop: 6, color: '#333', lineHeight: 20 },
  unitChip: {
    borderWidth: 1,
    borderColor: '#d0d0d5',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#fff',
  },
  unitChipActive: { backgroundColor: '#1e6fb8', borderColor: '#1e6fb8' },
  unitChipText: { color: '#222', fontSize: 12, fontWeight: '600' },
  unitChipTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  editBtn: { backgroundColor: '#1e6fb8', borderColor: '#1e6fb8' },
  editBtnText: { color: '#fff', fontWeight: '700' },
  deleteBtn: { backgroundColor: '#fff', borderColor: '#c0392b' },
  deleteBtnText: { color: '#c0392b', fontWeight: '700' },
  trainerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#c8ddf5',
    gap: 12,
  },
  trainerCardLeft: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8f0fb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trainerCardBody: { flex: 1 },
  trainerCardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  trainerCardSub: { fontSize: 12, color: '#888', marginTop: 2 },
  becomeTrainerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5c8a5c',
    backgroundColor: '#f4faf4',
  },
  becomeTrainerText: { fontSize: 14, fontWeight: '600', color: '#5c8a5c' },
});
