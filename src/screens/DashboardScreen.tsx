import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Button,
} from 'react-native';
import {
  getRecommendations,
  RecommendationResponse,
} from '../api/recommendations';

// Demo inputs until profile + meal logging are wired up.
const DEMO_PARAMS = {
  sex: 'male',
  weightKg: 80,
  heightCm: 180,
  age: 30,
  activityLevel: 'sedentary',
  goal: 'maintain' as const,
  caloriesIn: 2700,
  caloriesBurnedExercise: 0,
};

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await getRecommendations(DEMO_PARAMS);
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? 'Request failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
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
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.muted}>Goal: {goal}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's calories</Text>
        <Row label="Consumed" value={`${balance.caloriesIn} kcal`} />
        <Row label="Burned (exercise)" value={`${balance.caloriesBurnedExercise} kcal`} />
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
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  rowLabel: { color: '#444' },
  rowValue: { color: '#111' },
  divider: { height: 1, backgroundColor: '#e5e5ea', marginVertical: 6 },
  recoTitle: { fontSize: 18, fontWeight: '600', marginTop: 4 },
  reason: { marginTop: 6, color: '#333', lineHeight: 20 },
});
