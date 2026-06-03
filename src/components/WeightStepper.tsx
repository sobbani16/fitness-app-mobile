import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { adjustWeight } from '../services/exerciseAutofill';

interface Props {
  value: number | null;
  onChange: (v: number) => void;
  step?: number;
  label?: string;
}

export default function WeightStepper({ value, onChange, step = 2.5, label = 'Weight' }: Props) {
  const display = value === null || Number.isNaN(value) ? '' : String(value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => onChange(adjustWeight(value, -step))}
          style={styles.btn}
          hitSlop={8}
        >
          <Text style={styles.btnText}>−</Text>
        </Pressable>
        <TextInput
          style={styles.input}
          value={display}
          onChangeText={(t) => {
            const n = Number(t);
            if (t === '') onChange(0);
            else if (Number.isFinite(n) && n >= 0) onChange(n);
          }}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Pressable
          onPress={() => onChange(adjustWeight(value, step))}
          style={styles.btn}
          hitSlop={8}
        >
          <Text style={styles.btnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 8 },
  label: { fontSize: 13, color: '#4b5563', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 22, fontWeight: '600', color: '#111827' },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
});
