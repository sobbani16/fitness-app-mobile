import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useProfile } from '../context/ProfileContext';
import { useFocusEffect } from '@react-navigation/native';
import { reconcileMealDays } from '../services/mealSync';
import { getSession } from '../storage/session';
import { DaySummary, loadHistory } from '../storage/meals';
import { getHistory, HistoryEntry, HistoryResponse } from '../api/history';

const DAYS = 28; // 4 weeks

const STATUS_COLORS: Record<string, string> = {
  on_target: '#2e7d32',
  surplus: '#b85c00',
  deficit: '#1e6fb8',
};

export default function HistoryScreen() {
  const { profile } = useProfile();
  const [offset, setOffset] = useState(0);
  const [savedDays, setSavedDays] = useState<DaySummary[]>([]);
  const request = useRef(0);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  const load = useCallback(async () => {
    const generation = ++request.current;
    const userId = getSession()?.user.id;
    const current = () => generation === request.current && !!userId && getSession()?.user.id === userId;
    if (!profile) { setLoading(false); return; }
    setError(null);
    setData(null);
    setSavedDays([]);
    const ending = new Date(); ending.setHours(0, 0, 0, 0);
    ending.setDate(ending.getDate() - offset);
    try {
      const cached = await loadHistory(DAYS, ending);
      if (!current()) return;
      setSavedDays(cached);
      setLoading(false);
      setRefreshing(true);
      try {
        await reconcileMealDays(cached.map(day => new Date(day.date + 'T12:00:00')));
      } catch {
        if (!current()) return;
        setError('Could not sync history. Showing saved meals; pull to retry.');
      }
      if (!current()) return;
      const local = await loadHistory(DAYS, ending);
      if (!current()) return;
      setSavedDays(local);
      const res = await getHistory({
        profile: {
          sex: profile.sex, weightKg: profile.weightKg, heightCm: profile.heightCm,
          age: profile.age, activityLevel: profile.activityLevel, goal: profile.goal,
        },
        days: local,
      });
      if (!current()) return;
      setData(res);
      setSelected(res.entries[res.entries.length - 1] ?? null);
    } catch {
      if (current()) setError('Could not load history analysis. Showing saved meal totals; pull to retry.');
    } finally {
      if (current()) { setLoading(false); setRefreshing(false); }
    }
  }, [profile, offset]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void load();
    return () => { request.current++; };
  }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  // Weekly rollup = last 7 entries (they are sorted ascending so tail = most recent).
  const weekly = useMemo(() => {
    if (!data) return null;
    const last7 = data.entries.slice(-7);
    const logged = last7.filter((e) => e.logged);
    const daysLogged = logged.length;
    const avgNet = logged.length
      ? Math.round(logged.reduce((s, e) => s + e.net, 0) / logged.length)
      : 0;
    const avgSurplus = logged.length
      ? Math.round(logged.reduce((s, e) => s + e.surplus, 0) / logged.length)
      : 0;
    // Best day = closest to target among logged days (smallest |surplus|).
    let best: HistoryEntry | null = null;
    for (const e of logged) {
      if (!best || Math.abs(e.surplus) < Math.abs(best.surplus)) best = e;
    }
    return { last7, daysLogged, avgNet, avgSurplus, best };
  }, [data]);

  // Pad calendar with empty cells at the start to align to a Monday grid.
  const grid = useMemo(() => {
    if (!data) return { leadingBlanks: 0, entries: [] as HistoryEntry[] };
    const first = data.entries[0];
    if (!first) return { leadingBlanks: 0, entries: [] };
    // getDay: Sun=0..Sat=6 → we want Mon=0..Sun=6
    const d = new Date(first.date + 'T00:00:00');
    const offset = (d.getDay() + 6) % 7;
    return { leadingBlanks: offset, entries: data.entries };
  }, [data]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>History</Text>
      {refreshing && <Text style={styles.muted}>Updating history…</Text>}
      {error && <Text style={styles.err}>{error}</Text>}

      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Older 4 weeks" onPress={() => setOffset(n => n + DAYS)}><Text>← Older 4 weeks</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Newer 4 weeks" disabled={offset === 0} onPress={() => setOffset(n => Math.max(0, n - DAYS))}><Text style={offset === 0 ? styles.muted : undefined}>Newer 4 weeks →</Text></Pressable>
      </View>
      <Text style={styles.muted}>{savedDays[0]?.date} – {savedDays[savedDays.length - 1]?.date}</Text>
      {!data && savedDays.map(day => (
        <View key={day.date} style={styles.row}>
          <Text>{formatDate(day.date)}</Text>
          <Text>{day.mealCount} meals · {day.caloriesIn} kcal saved</Text>
        </View>
      ))}
      {data && (
        <>
          <View style={styles.streakRow}>
            <StreakCard label="Window logging streak" value={data.streaks.logged} unit="days" color="#1e6fb8" />
            <StreakCard label="Window on-target streak" value={data.streaks.onTarget} unit="days" color="#2e7d32" />
          </View>

          {weekly && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Last 7 days of this window</Text>
              <Row label="Days logged" value={`${weekly.daysLogged} / 7`} />
              <Row label="Avg net" value={`${weekly.avgNet} kcal`} />
              <Row
                label="Avg vs target"
                value={`${weekly.avgSurplus > 0 ? '+' : ''}${weekly.avgSurplus} kcal`}
              />
              <Row
                label="Best day"
                value={
                  weekly.best
                    ? `${formatDate(weekly.best.date)} (${weekly.best.surplus > 0 ? '+' : ''}${weekly.best.surplus} kcal)`
                    : '—'
                }
              />
            </View>
          )}

          <Text style={styles.muted}>{DAYS}-day window · TDEE {data.tdee} kcal</Text>

          <View style={styles.weekHeader}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <Text key={i} style={styles.weekLabel}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {Array.from({ length: grid.leadingBlanks }).map((_, i) => (
              <View key={`blank-${i}`} style={[styles.cell, styles.cellBlank]} />
            ))}
            {grid.entries.map((e) => {
              const active = selected?.date === e.date;
              const bg = !e.logged
                ? '#f2f2f4'
                : STATUS_COLORS[e.status] || '#bbb';
              return (
                <Pressable
                  key={e.date}
                  onPress={() => setSelected(e)}
                  style={[
                    styles.cell,
                    { backgroundColor: bg },
                    active && styles.cellActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellDay,
                      { color: e.logged ? '#fff' : '#888' },
                    ]}
                  >
                    {Number(e.date.slice(8, 10))}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legend}>
            <Legend color={STATUS_COLORS.on_target} label="On target" />
            <Legend color={STATUS_COLORS.surplus} label="Surplus" />
            <Legend color={STATUS_COLORS.deficit} label="Deficit" />
            <Legend color="#f2f2f4" label="No log" border />
          </View>

          {selected && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{formatDate(selected.date)}</Text>
              {selected.logged ? (
                <>
                  <Row label="Meals" value={`${selected.mealCount}`} />
                  <Row label="Calories in" value={`${selected.caloriesIn} kcal`} />
                  <Row label="Target" value={`${selected.target} kcal`} />
                  <Row label="Net" value={`${selected.net} kcal`} />
                  <Row
                    label="Balance"
                    value={`${selected.surplus > 0 ? '+' : ''}${selected.surplus} kcal (${selected.status.replace('_', ' ')})`}
                    color={STATUS_COLORS[selected.status]}
                  />
                </>
              ) : (
                <Text style={styles.muted}>No meals logged this day.</Text>
              )}
            </View>
          )}
        </>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function StreakCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={[styles.streakCard, { borderColor: color }]}>
      <Text style={[styles.streakValue, { color }]}>{value}</Text>
      <Text style={styles.streakUnit}>{unit}</Text>
      <Text style={styles.streakLabel}>{label}</Text>
    </View>
  );
}

function Legend({ color, label, border }: { color: string; label: string; border?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          { backgroundColor: color },
          border && { borderWidth: 1, borderColor: '#ccc' },
        ]}
      />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, color ? { color, fontWeight: '700' } : null]}>{value}</Text>
    </View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const CELL = 40;

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700' },
  muted: { color: '#666' },
  err: { color: '#c0392b' },
  streakRow: { flexDirection: 'row', gap: 10 },
  streakCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
    backgroundColor: '#fff',
  },
  streakValue: { fontSize: 28, fontWeight: '800' },
  streakUnit: { color: '#444', marginTop: -4 },
  streakLabel: { color: '#666', marginTop: 4, fontSize: 13 },
  weekHeader: {
    flexDirection: 'row',
    marginTop: 4,
  },
  weekLabel: {
    width: CELL,
    marginRight: 6,
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: CELL,
    height: CELL,
    marginRight: 6,
    marginBottom: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellBlank: { backgroundColor: 'transparent' },
  cellActive: {
    borderWidth: 2,
    borderColor: '#111',
  },
  cellDay: { fontSize: 12, fontWeight: '600' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 4 },
  card: {
    backgroundColor: '#f7f7f9',
    borderRadius: 12,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    marginTop: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  rowLabel: { color: '#444' },
  rowValue: { color: '#111' },
});
