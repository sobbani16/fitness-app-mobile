import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getHealthScore, HealthScoreResponse } from '../api/healthScore';

interface Props {
  onPress?: (data: HealthScoreResponse) => void;
}

const SCORE_COLORS = { elite: '#2e7d32', excellent: '#2e7d32', good: '#1e6fb8', fair: '#e6a817', needs_attention: '#c0392b' };
const STATUS_EMOJI = { elite: '🏆', excellent: '🟢', good: '🔵', fair: '🟡', needs_attention: '🔴' };
const STATUS_LABEL = { elite: 'Elite', excellent: 'Excellent', good: 'Good', fair: 'Fair', needs_attention: 'Needs Attention' };

export default function HealthScoreCard({ onPress }: Props) {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<HealthScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHealthScore()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.card}><ActivityIndicator /></View>;
  if (!data) return null;

  const color = SCORE_COLORS[data.status as keyof typeof SCORE_COLORS] || '#666';
  const emoji = STATUS_EMOJI[data.status as keyof typeof STATUS_EMOJI] || '';
  const label = STATUS_LABEL[data.status as keyof typeof STATUS_LABEL] || data.status;

  return (
    <Pressable style={styles.card} onPress={() => { onPress?.(data); navigation.navigate('HealthScoreDetail'); }}>
      <View style={styles.row}>
        {/* Score */}
        <View style={[styles.circle, { borderColor: color }]}>
          <Text style={[styles.score, { color }]}>{data.score}</Text>
          <Text style={styles.outOf}>/100</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.title}>Health Score</Text>
          <Text style={[styles.status, { color }]}>{emoji} {label}</Text>
        </View>
      </View>

      {/* Top insights */}
      {data.insights.slice(0, 2).map((insight, i) => (
        <Text key={i} style={[styles.insight, insight.severity === 'critical' && styles.insightCritical]}>
          {insight.message}
        </Text>
      ))}

      {/* Top contributors */}
      {data.topContributors.slice(0, 3).map((c, i) => (
        <View key={i} style={styles.contributorRow}>
          <Text style={styles.contributorIcon}>{c.scoreImpact > 0 ? '✦' : '✕'}</Text>
          <Text style={styles.contributorName}>{c.itemName}</Text>
          <Text style={[styles.contributorImpact, { color: c.scoreImpact > 0 ? '#2e7d32' : '#c0392b' }]}>
            {c.scoreImpact > 0 ? '+' : ''}{c.scoreImpact}
          </Text>
        </View>
      ))}

      <Text style={styles.tap}>Tap for full breakdown →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f7f7f9',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  circle: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 28, fontWeight: '800' },
  outOf: { fontSize: 11, color: '#888' },
  info: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: '#222' },
  status: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  insight: { fontSize: 13, color: '#555', paddingLeft: 4 },
  insightCritical: { color: '#c0392b', fontWeight: '600' },
  contributorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 },
  contributorIcon: { fontSize: 10, width: 14 },
  contributorName: { flex: 1, fontSize: 13, color: '#333' },
  contributorImpact: { fontSize: 13, fontWeight: '700' },
  tap: { fontSize: 11, color: '#1e6fb8', textAlign: 'right', marginTop: 4 },
});
