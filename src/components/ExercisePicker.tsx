import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { EXERCISE_TYPES } from '../types/exercise';

interface Props {
  value: string;
  onChange: (t: string) => void;
}

function prettify(t: string) {
  return t
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function ExercisePicker({ value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {EXERCISE_TYPES.map((t) => {
        const active = t === value;
        return (
          <Pressable
            key={t}
            onPress={() => onChange(t)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {prettify(t)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 14,
    color: '#111827',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
