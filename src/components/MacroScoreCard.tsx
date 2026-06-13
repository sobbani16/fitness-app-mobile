import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { getMacroScore, MacroScoreResponse } from '../api/macroScore';

interface Props {
  onPress?: (data: MacroScoreResponse) => void;
}

const COLORS = { green: '#2e7d32', yellow: '#e6a817', red: '#c0392b' };

function MacroBar({ label, actual, target, score, color }: {
  label: string; actual: number; target: number; score: number; color: string;
}) {
  const pct = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroLabelRow}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={[styles.macroValue, { color: COLORS[color as keyof typeof COLORS] || '#666' }]}>
          {Math.round(actual)}g / {target}g
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: COLORS[color as keyof typeof COLORS] || '#ccc' }]} />
      </View>
    </View>
  );
}

export default function MacroScoreCard({ onPress }: Props) {
  const [data, setData] = useState<MacroScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMacroScore()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!data) return null;

  const { overallScore, overallColor, breakdown, calories } = data;

  return (
    <Pressable style={styles.card} onPress={() => onPress?.(data)}>
      {/* Score circle */}
      <View style={styles.header}>
        <View style={[styles.scoreCircle, { borderColor: COLORS[overallColor] }]}>
          <Text style={[styles.scoreText, { color: COLORS[overallColor] }]}>{overallScore}</Text>
          <Text style={styles.scoreLabel}>score</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.cardTitle}>Macro Score</Text>
          <Text style={styles.calorieText}>
            {calories.actual} / {calories.target} kcal
          </Text>
          <Text style={styles.tapHint}>Tap for details →</Text>
        </View>
      </View>

      {/* Macro bars */}
      <MacroBar label="Protein" actual={breakdown.protein.actual} target={breakdown.protein.target} score={breakdown.protein.score} color={breakdown.protein.color} />
      <MacroBar label="Carbs" actual={breakdown.carbs.actual} target={breakdown.carbs.target} score={breakdown.carbs.score} color={breakdown.carbs.color} />
      <MacroBar label="Fat" actual={breakdown.fat.actual} target={breakdown.fat.target} score={breakdown.fat.score} color={breakdown.fat.color} />
      <MacroBar label="Fiber" actual={breakdown.fiber.actual} target={breakdown.fiber.target} score={breakdown.fiber.score} color={breakdown.fiber.color} />
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4 },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { fontSize: 24, fontWeight: '800' },
  scoreLabel: { fontSize: 10, color: '#888' },
  headerRight: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  calorieText: { fontSize: 13, color: '#666', marginTop: 2 },
  tapHint: { fontSize: 11, color: '#1e6fb8', marginTop: 4 },
  macroRow: { gap: 2 },
  macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroLabel: { fontSize: 13, fontWeight: '600', color: '#444' },
  macroValue: { fontSize: 12, fontWeight: '600' },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: '#e5e5ea', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
});
