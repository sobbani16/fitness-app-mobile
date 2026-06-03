import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ExerciseSet } from '../types/exercise';

interface Props {
  sets: ExerciseSet[];
}

export default function SetList({ sets }: Props) {
  if (sets.length === 0) {
    return <Text style={styles.empty}>No sets logged yet.</Text>;
  }
  return (
    <View style={styles.wrap}>
      <View style={[styles.row, styles.header]}>
        <Text style={[styles.cell, styles.idx]}>#</Text>
        <Text style={styles.cell}>Reps</Text>
        <Text style={styles.cell}>Weight</Text>
      </View>
      {sets.map((s, i) => (
        <View key={`${s.timestamp}-${i}`} style={styles.row}>
          <Text style={[styles.cell, styles.idx]}>{i + 1}</Text>
          <Text style={styles.cell}>{s.reps}</Text>
          <Text style={styles.cell}>{s.weight}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  header: { backgroundColor: '#f9fafb' },
  cell: { flex: 1, fontSize: 15, color: '#111827' },
  idx: { flex: 0.3, color: '#6b7280' },
  empty: { color: '#6b7280', marginTop: 12 },
});
