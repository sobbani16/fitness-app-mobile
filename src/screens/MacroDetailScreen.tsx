import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { getMacroScore, getMacroTrend, MacroScoreResponse, TrendPoint } from '../api/macroScore';

const COLORS = { green: '#2e7d32', yellow: '#e6a817', red: '#c0392b' };
const STATUS_ICON = { on_track: '✓', low: '↓', high: '↑' };

export default function MacroDetailScreen() {
  const [data, setData] = useState<MacroScoreResponse | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [trendDays, setTrendDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMacroScore(), getMacroTrend(trendDays)])
      .then(([score, t]) => { setData(score); setTrend(t); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [trendDays]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  if (!data) {
    return <View style={styles.center}><Text style={styles.muted}>No macro data yet. Log some meals!</Text></View>;
  }

  const macros = ['protein', 'carbs', 'fat', 'fiber'] as const;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Overall score */}
      <View style={styles.scoreHeader}>
        <View style={[styles.bigCircle, { borderColor: COLORS[data.overallColor] }]}>
          <Text style={[styles.bigScore, { color: COLORS[data.overallColor] }]}>{data.overallScore}</Text>
          <Text style={styles.bigLabel}>/ 100</Text>
        </View>
        <Text style={styles.date}>{data.date}</Text>
        <Text style={styles.caloriesSub}>
          {data.calories.actual} / {data.calories.target} kcal · {data.mealCount} meal{data.mealCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Macro detail cards */}
      {macros.map((key) => {
        const m = data.breakdown[key];
        const pct = m.target > 0 ? Math.min(100, (m.actual / m.target) * 100) : 0;
        return (
          <View key={key} style={styles.macroCard}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroTitle}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
              <View style={[styles.badge, { backgroundColor: COLORS[m.color] + '20' }]}>
                <Text style={[styles.badgeText, { color: COLORS[m.color] }]}>
                  {STATUS_ICON[m.status]} {m.score}
                </Text>
              </View>
            </View>
            <View style={styles.macroStats}>
              <Text style={styles.macroActual}>{m.actual}g</Text>
              <Text style={styles.macroTarget}>/ {m.target}g target</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: COLORS[m.color] }]} />
            </View>
            <Text style={styles.tip}>{m.tip}</Text>
          </View>
        );
      })}

      {/* Hydration */}
      <View style={styles.macroCard}>
        <View style={styles.macroHeader}>
          <Text style={styles.macroTitle}>Hydration</Text>
          <View style={[styles.badge, { backgroundColor: COLORS[data.hydration.color as keyof typeof COLORS] + '20' }]}>
            <Text style={[styles.badgeText, { color: COLORS[data.hydration.color as keyof typeof COLORS] }]}>
              {data.hydration.score}
            </Text>
          </View>
        </View>
        <Text style={styles.macroTarget}>
          {data.hydration.actual}ml / {data.hydration.target}ml
        </Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, {
            width: `${Math.min(100, (data.hydration.actual / data.hydration.target) * 100)}%`,
            backgroundColor: COLORS[data.hydration.color as keyof typeof COLORS] || '#1e6fb8',
          }]} />
        </View>
      </View>

      {/* Trend */}
      <View style={styles.trendSection}>
        <Text style={styles.sectionTitle}>Score Trend</Text>
        <View style={styles.trendToggle}>
          {[7, 30].map((d) => (
            <Pressable key={d} style={[styles.toggleBtn, trendDays === d && styles.toggleActive]} onPress={() => setTrendDays(d)}>
              <Text style={[styles.toggleText, trendDays === d && styles.toggleTextActive]}>{d}d</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {trend.length === 0 ? (
        <Text style={styles.muted}>Not enough data for a trend yet. Keep logging!</Text>
      ) : (
        <View style={styles.trendChart}>
          {trend.map((t, i) => {
            const height = Math.max(4, (t.overallScore / 100) * 80);
            const color = t.overallScore >= 80 ? COLORS.green : t.overallScore >= 60 ? COLORS.yellow : COLORS.red;
            return (
              <View key={i} style={styles.trendBar}>
                <View style={[styles.trendBarFill, { height, backgroundColor: color }]} />
                <Text style={styles.trendDate}>{t.date.slice(5)}</Text>
                <Text style={styles.trendScore}>{t.overallScore}</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { color: '#666', textAlign: 'center' },
  scoreHeader: { alignItems: 'center', marginBottom: 8 },
  bigCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 5, alignItems: 'center', justifyContent: 'center' },
  bigScore: { fontSize: 36, fontWeight: '800' },
  bigLabel: { fontSize: 12, color: '#888' },
  date: { fontSize: 14, color: '#666', marginTop: 8 },
  caloriesSub: { fontSize: 13, color: '#888', marginTop: 2 },
  macroCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  macroTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  macroStats: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  macroActual: { fontSize: 22, fontWeight: '800', color: '#111' },
  macroTarget: { fontSize: 13, color: '#888' },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: '#e5e5ea', overflow: 'hidden', marginTop: 2 },
  barFill: { height: '100%', borderRadius: 4 },
  tip: { fontSize: 12, color: '#555', marginTop: 4, fontStyle: 'italic' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  trendSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  trendToggle: { flexDirection: 'row', gap: 6 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#e5e5ea' },
  toggleActive: { backgroundColor: '#1e6fb8' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#666' },
  toggleTextActive: { color: '#fff' },
  trendChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 120, paddingTop: 10 },
  trendBar: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  trendBarFill: { width: '80%', borderRadius: 3, minHeight: 4 },
  trendDate: { fontSize: 8, color: '#888', marginTop: 2 },
  trendScore: { fontSize: 9, color: '#444', fontWeight: '600' },
});
