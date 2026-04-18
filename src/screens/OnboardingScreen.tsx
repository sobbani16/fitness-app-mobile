import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useProfile } from '../context/ProfileContext';
import {
  ActivityLevel,
  Goal,
  Sex,
} from '../storage/profile';

const SEXES: Sex[] = ['male', 'female', 'other'];
const ACTIVITY: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const GOALS: Goal[] = ['lose', 'maintain', 'gain'];

export default function OnboardingScreen() {
  const { setProfile } = useProfile();

  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('30');
  const [heightCm, setHeightCm] = useState('175');
  const [weightKg, setWeightKg] = useState('75');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('sedentary');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [saving, setSaving] = useState(false);

  const onSubmit = async () => {
    const ageN = Number(age);
    const hN = Number(heightCm);
    const wN = Number(weightKg);
    if (!name.trim()) return Alert.alert('Missing name', 'Please enter your name.');
    if (!isFinite(ageN) || ageN <= 0 || ageN > 120) return Alert.alert('Invalid age');
    if (!isFinite(hN) || hN <= 50 || hN > 260) return Alert.alert('Invalid height (cm)');
    if (!isFinite(wN) || wN <= 20 || wN > 400) return Alert.alert('Invalid weight (kg)');

    try {
      setSaving(true);
      await setProfile({
        name: name.trim(),
        sex,
        age: ageN,
        heightCm: hN,
        weightKg: wN,
        activityLevel,
        goal,
        createdAt: new Date().toISOString(),
      });
    } catch (e: any) {
      Alert.alert('Could not save profile', e?.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Tell us a bit about you. We'll use this to set your daily calorie target.</Text>

        <Field label="Name">
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
          />
        </Field>

        <Field label="Sex">
          <Segmented options={SEXES} value={sex} onChange={setSex} />
        </Field>

        <Field label="Age (years)">
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
          />
        </Field>

        <Field label="Height (cm)">
          <TextInput
            style={styles.input}
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="number-pad"
          />
        </Field>

        <Field label="Weight (kg)">
          <TextInput
            style={styles.input}
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="decimal-pad"
          />
        </Field>

        <Field label="Activity level">
          <Segmented options={ACTIVITY} value={activityLevel} onChange={setActivityLevel} />
        </Field>

        <Field label="Goal">
          <Segmented options={GOALS} value={goal} onChange={setGoal} />
        </Field>

        <View style={{ height: 8 }} />
        <Button title={saving ? 'Saving…' : 'Continue'} onPress={onSubmit} disabled={saving} />
        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {opt.replace('_', ' ')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#555', marginBottom: 8 },
  field: { gap: 6 },
  label: { fontSize: 13, color: '#444', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  segment: {
    borderWidth: 1,
    borderColor: '#d0d0d5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  segmentActive: {
    backgroundColor: '#1e6fb8',
    borderColor: '#1e6fb8',
  },
  segmentText: { color: '#222', fontSize: 14 },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
});
