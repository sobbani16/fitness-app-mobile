import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { getClientProgress, ClientProgress } from '../api/trainers';
import { RootStackParamList } from '../navigation/RootNavigator';

type RoutePropType = RouteProp<RootStackParamList, 'ClientProgress'>;

type Period = 'daily' | 'weekly' | 'monthly' | '6months';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: '7 Days' },
  { key: 'monthly', label: '30 Days' },
  { key: '6months', label: '6 Months' },
];

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={18} color="#1e6fb8" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return <Text style={styles.emptyText}>{message}</Text>;
}

function WeightSection({ entries }: { entries: any[] }) {
  if (!entries.length) return <EmptyState message="No weight entries in this period." />;
  const latest = entries[entries.length - 1];
  const first = entries[0];
  const change = latest.weightKg - first.weightKg;
  return (
    <View>
      <View style={styles.metricRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Latest</Text>
          <Text style={styles.metricValue}>{latest.weightKg.toFixed(1)} kg</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Change</Text>
          <Text style={[styles.metricValue, change < 0 ? styles.positive : change > 0 ? styles.negative : {}]}>
            {change >= 0 ? '+' : ''}{change.toFixed(1)} kg
          </Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Entries</Text>
          <Text style={styles.metricValue}>{entries.length}</Text>
        </View>
      </View>
      {entries.slice(-5).reverse().map((e) => (
        <View key={e.id} style={styles.logRow}>
          <Text style={styles.logDate}>{new Date(e.recordedAt).toLocaleDateString()}</Text>
          <Text style={styles.logValue}>{e.weightKg.toFixed(1)} kg</Text>
        </View>
      ))}
    </View>
  );
}

function MacroSection({ scores }: { scores: any[] }) {
  if (!scores.length) return <EmptyState message="No nutrition data in this period." />;
  const avg = (field: string) =>
    (scores.reduce((sum, s) => sum + (s[field] ?? 0), 0) / scores.length).toFixed(1);
  return (
    <View>
      <View style={styles.metricRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Avg Score</Text>
          <Text style={styles.metricValue}>{avg('overallScore')}%</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Avg Cal</Text>
          <Text style={styles.metricValue}>{avg('calories')}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Avg Protein</Text>
          <Text style={styles.metricValue}>{avg('proteinG')}g</Text>
        </View>
      </View>
      {scores.slice(-5).reverse().map((s) => (
        <View key={s.id} style={styles.logRow}>
          <Text style={styles.logDate}>{s.date}</Text>
          <Text style={styles.logValue}>{Number(s.overallScore).toFixed(0)}% · {Number(s.calories).toFixed(0)} kcal</Text>
        </View>
      ))}
    </View>
  );
}

function WorkoutSection({ sessions }: { sessions: any[] }) {
  if (!sessions.length) return <EmptyState message="No workouts in this period." />;
  const totalMin = sessions.reduce((s, w) => s + w.durationMinutes, 0);
  const totalCal = sessions.reduce((s, w) => s + (w.caloriesBurned ?? 0), 0);
  return (
    <View>
      <View style={styles.metricRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Sessions</Text>
          <Text style={styles.metricValue}>{sessions.length}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Total Min</Text>
          <Text style={styles.metricValue}>{totalMin}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Calories</Text>
          <Text style={styles.metricValue}>{totalCal.toFixed(0)}</Text>
        </View>
      </View>
      {sessions.slice(-5).reverse().map((s) => (
        <View key={s.id} style={styles.logRow}>
          <Text style={styles.logDate}>{new Date(s.startedAt).toLocaleDateString()}</Text>
          <Text style={styles.logValue}>{s.workoutType} · {s.durationMinutes} min</Text>
        </View>
      ))}
    </View>
  );
}

function HealthScoreSection({ scores }: { scores: any[] }) {
  if (!scores.length) return <EmptyState message="No health score data in this period." />;
  const avg = (scores.reduce((s, h) => s + h.score, 0) / scores.length).toFixed(1);
  return (
    <View>
      <View style={styles.metricRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Avg Score</Text>
          <Text style={styles.metricValue}>{avg}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Latest</Text>
          <Text style={styles.metricValue}>{scores[scores.length - 1].score.toFixed(0)}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Days</Text>
          <Text style={styles.metricValue}>{scores.length}</Text>
        </View>
      </View>
      {scores.slice(-5).reverse().map((h) => (
        <View key={h.id} style={styles.logRow}>
          <Text style={styles.logDate}>{h.date}</Text>
          <Text style={styles.logValue}>{h.score.toFixed(0)} · {h.status}</Text>
        </View>
      ))}
    </View>
  );
}

function StepsSection({ steps }: { steps: any[] }) {
  if (!steps.length) return <EmptyState message="No step data in this period." />;
  const total = steps.reduce((s, d) => s + d.steps, 0);
  const avg = Math.round(total / steps.length);
  return (
    <View>
      <View style={styles.metricRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Avg / Day</Text>
          <Text style={styles.metricValue}>{avg.toLocaleString()}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Total</Text>
          <Text style={styles.metricValue}>{total.toLocaleString()}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Days</Text>
          <Text style={styles.metricValue}>{steps.length}</Text>
        </View>
      </View>
    </View>
  );
}

function SleepSection({ sleep }: { sleep: any[] }) {
  if (!sleep.length) return <EmptyState message="No sleep data in this period." />;
  const withHours = sleep.filter((s) => s.hoursSlept != null);
  const avg = withHours.length
    ? (withHours.reduce((s, l) => s + l.hoursSlept, 0) / withHours.length).toFixed(1)
    : 'N/A';
  return (
    <View>
      <View style={styles.metricRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Avg Sleep</Text>
          <Text style={styles.metricValue}>{avg} hrs</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Nights</Text>
          <Text style={styles.metricValue}>{sleep.length}</Text>
        </View>
      </View>
      {sleep.slice(-5).reverse().map((s) => (
        <View key={s.id} style={styles.logRow}>
          <Text style={styles.logDate}>{new Date(s.sleepStart).toLocaleDateString()}</Text>
          <Text style={styles.logValue}>{s.hoursSlept?.toFixed(1) ?? '?'} hrs</Text>
        </View>
      ))}
    </View>
  );
}

export default function ClientProgressScreen() {
  const route = useRoute<RoutePropType>();
  const { clientId } = route.params;

  const [period, setPeriod] = useState<Period>('weekly');
  const [data, setData] = useState<ClientProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: Period) => {
    setError(null);
    try {
      const result = await getClientProgress(clientId, p);
      setData(result);
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId]);

  useEffect(() => { load(period); }, [period, load]);

  const onRefresh = () => { setRefreshing(true); load(period); };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1e6fb8" /></View>;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Engagement banner */}
      {data && (
        <View style={styles.banner}>
          <Ionicons name="calendar-outline" size={15} color="#1e6fb8" />
          <Text style={styles.bannerText}>
            {data.daysWithTrainer} day{data.daysWithTrainer !== 1 ? 's' : ''} together · Since {new Date(data.engagementStart).toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* Period picker */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodTab, period === p.key && styles.periodTabActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodTabText, period === p.key && styles.periodTabTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {data && (
          <>
            <SectionCard title="Weight" icon="scale-outline">
              <WeightSection entries={data.weight} />
            </SectionCard>

            <SectionCard title="Nutrition" icon="nutrition-outline">
              <MacroSection scores={data.macroScores} />
            </SectionCard>

            <SectionCard title="Workouts" icon="barbell-outline">
              <WorkoutSection sessions={data.workoutSessions} />
            </SectionCard>

            <SectionCard title="Health Score" icon="heart-outline">
              <HealthScoreSection scores={data.healthScores} />
            </SectionCard>

            <SectionCard title="Steps" icon="footsteps-outline">
              <StepsSection steps={data.steps} />
            </SectionCard>

            <SectionCard title="Sleep" icon="moon-outline">
              <SleepSection sleep={data.sleep} />
            </SectionCard>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#c0392b', textAlign: 'center', padding: 20 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e8f0fb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#d0dff5',
  },
  bannerText: { fontSize: 13, color: '#1e6fb8', fontWeight: '600' },

  periodRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    gap: 8,
  },
  periodTab: { flex: 1, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f0f0f5', alignItems: 'center' },
  periodTabActive: { backgroundColor: '#1e6fb8' },
  periodTabText: { fontSize: 12, fontWeight: '600', color: '#555' },
  periodTabTextActive: { color: '#fff' },

  scroll: { padding: 16, paddingBottom: 32 },

  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },

  metricRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  metricBox: { flex: 1, backgroundColor: '#f7f7f9', borderRadius: 10, padding: 10, alignItems: 'center' },
  metricLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
  metricValue: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  positive: { color: '#2e7d32' },
  negative: { color: '#c0392b' },

  logRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f0f0f5' },
  logDate: { fontSize: 13, color: '#888' },
  logValue: { fontSize: 13, fontWeight: '600', color: '#333' },

  emptyText: { fontSize: 13, color: '#aaa', fontStyle: 'italic' },
});
