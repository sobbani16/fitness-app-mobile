import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getHealthScore, getActions, getHealthTrend,
  HealthScoreResponse, ImprovementAction, TrendPoint,
} from '../api/healthScore';

const C = { green: '#2e7d32', yellow: '#e6a817', red: '#c0392b', blue: '#1e6fb8' };

function colorForScore(s: number) {
  if (s >= 80) return C.green;
  if (s >= 60) return C.yellow;
  return C.red;
}

function ComponentBar({ label, score, weight }: { label: string; score: number; weight: number }) {
  const color = colorForScore(score);
  return (
    <View style={styles.compRow}>
      <Text style={styles.compLabel}>{label}</Text>
      <View style={styles.compBarTrack}>
        <View style={[styles.compBarFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.compScore, { color }]}>{score}</Text>
      <Text style={styles.compWeight}>{Math.round(weight * 100)}%</Text>
    </View>
  );
}

export default function HealthScoreDetailScreen() {
  const [data, setData] = useState<HealthScoreResponse | null>(null);
  const [actions, setActions] = useState<ImprovementAction[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [trendDays, setTrendDays] = useState(7);
  const [loading, setLoading] = useState(true);

  // Re-fetch fresh data every time this screen is focused
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([getHealthScore(), getActions(), getHealthTrend(trendDays)])
        .then(([s, a, t]) => { setData(s); setActions(a.actions); setTrend(t); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [trendDays]),
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (!data) return <View style={styles.center}><Text style={styles.muted}>No data yet. Log some meals!</Text></View>;

  const { components: comp } = data;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Big score */}
      <View style={styles.header}>
        <View style={[styles.bigCircle, { borderColor: colorForScore(data.score) }]}>
          <Text style={[styles.bigNum, { color: colorForScore(data.score) }]}>{data.score}</Text>
          <Text style={styles.sub}>/100</Text>
        </View>
      </View>

      {/* Component breakdown */}
      <Text style={styles.sectionTitle}>Score Components</Text>
      <View style={styles.sectionCard}>
        <ComponentBar label="Macros" score={comp.macro.score} weight={comp.macro.weight} />
        <ComponentBar label="Conditions" score={comp.condition.score} weight={comp.condition.weight} />
        <ComponentBar label="Food Quality" score={comp.foodQuality.score} weight={comp.foodQuality.weight} />
        <ComponentBar label="Activity" score={comp.activity.score} weight={comp.activity.weight} />
        <ComponentBar label="Recovery" score={comp.recovery.score} weight={comp.recovery.weight} />
      </View>

      {/* Insights */}
      {data.insights.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Insights</Text>
          <View style={styles.sectionCard}>
            {data.insights.map((ins, i) => (
              <View key={i} style={styles.insightRow}>
                <Text style={styles.insightDot}>{ins.severity === 'critical' ? '🔴' : ins.severity === 'warning' ? '🟡' : 'ℹ️'}</Text>
                <Text style={styles.insightText}>{ins.message}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* All contributors */}
      <Text style={styles.sectionTitle}>What Affected Your Score</Text>
      <View style={styles.sectionCard}>
        {data.allContributors.sort((a, b) => Math.abs(b.scoreImpact) - Math.abs(a.scoreImpact)).map((c, i) => (
          <View key={i} style={styles.contribRow}>
            <View style={styles.contribLeft}>
              <Text style={styles.contribName}>{c.itemName}</Text>
              <Text style={styles.contribReason}>{c.reason}</Text>
            </View>
            <Text style={[styles.contribImpact, { color: c.scoreImpact > 0 ? C.green : C.red }]}>
              {c.scoreImpact > 0 ? '+' : ''}{c.scoreImpact}
            </Text>
          </View>
        ))}
        {data.allContributors.length === 0 && <Text style={styles.muted}>No contributors yet.</Text>}
      </View>

      {/* Improvement actions */}
      {actions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>How to Improve</Text>
          <View style={styles.sectionCard}>
            {actions.map((a, i) => (
              <View key={i} style={styles.actionRow}>
                <View style={styles.actionLeft}>
                  <Text style={styles.actionText}>{a.action}</Text>
                  <Text style={styles.actionSuggestion}>{a.suggestion}</Text>
                </View>
                <View style={styles.gainBadge}>
                  <Text style={styles.gainText}>+{a.potentialGain}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Trend */}
      <View style={styles.trendHeader}>
        <Text style={styles.sectionTitle}>Trend</Text>
        <View style={styles.toggleRow}>
          {[7, 30, 90].map((d) => (
            <Pressable key={d} style={[styles.toggleBtn, trendDays === d && styles.toggleActive]} onPress={() => setTrendDays(d)}>
              <Text style={[styles.toggleText, trendDays === d && styles.toggleTextActive]}>{d}d</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {trend.length > 0 ? (
        <View style={styles.chart}>
          {trend.map((t, i) => (
            <View key={i} style={styles.chartBar}>
              <View style={[styles.chartFill, { height: Math.max(4, (t.score / 100) * 80), backgroundColor: colorForScore(t.score) }]} />
              <Text style={styles.chartLabel}>{t.date.slice(5)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.muted}>Keep logging meals to see your trend!</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: '#888', textAlign: 'center' },
  header: { alignItems: 'center', marginBottom: 4 },
  bigCircle: { width: 110, height: 110, borderRadius: 55, borderWidth: 5, alignItems: 'center', justifyContent: 'center' },
  bigNum: { fontSize: 40, fontWeight: '800' },
  sub: { fontSize: 13, color: '#888' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#222', marginTop: 4 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: '#e5e5ea' },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compLabel: { width: 90, fontSize: 13, fontWeight: '600', color: '#444' },
  compBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#eee', overflow: 'hidden' },
  compBarFill: { height: '100%', borderRadius: 4 },
  compScore: { width: 28, textAlign: 'right', fontSize: 13, fontWeight: '700' },
  compWeight: { width: 32, textAlign: 'right', fontSize: 11, color: '#999' },
  insightRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  insightDot: { fontSize: 12 },
  insightText: { flex: 1, fontSize: 13, color: '#444' },
  contribRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contribLeft: { flex: 1 },
  contribName: { fontSize: 14, fontWeight: '600', color: '#222' },
  contribReason: { fontSize: 11, color: '#888' },
  contribImpact: { fontSize: 16, fontWeight: '800' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionLeft: { flex: 1 },
  actionText: { fontSize: 14, fontWeight: '600', color: '#222' },
  actionSuggestion: { fontSize: 12, color: '#666' },
  gainBadge: { backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  gainText: { fontSize: 14, fontWeight: '800', color: '#2e7d32' },
  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleRow: { flexDirection: 'row', gap: 6 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#e5e5ea' },
  toggleActive: { backgroundColor: '#1e6fb8' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#666' },
  toggleTextActive: { color: '#fff' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 100, backgroundColor: '#fff', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#e5e5ea' },
  chartBar: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartFill: { width: '80%', borderRadius: 3 },
  chartLabel: { fontSize: 7, color: '#999', marginTop: 2 },
});
