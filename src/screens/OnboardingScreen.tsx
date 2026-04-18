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
  UnitSystem,
} from '../storage/profile';
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from '../util/units';

const SEXES: Sex[] = ['male', 'female', 'other'];
const ACTIVITY: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const GOALS: Goal[] = ['lose', 'maintain', 'gain'];
const UNITS: UnitSystem[] = ['metric', 'imperial'];

export default function OnboardingScreen() {
  const { setProfile } = useProfile();

  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('30');
  const [units, setUnits] = useState<UnitSystem>('metric');

  // Metric input (kept in sync with imperial inputs below).
  const [heightCm, setHeightCm] = useState('175');
  const [weightKg, setWeightKg] = useState('75');

  // Imperial input (ft + in, lb).
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('9');
  const [weightLb, setWeightLb] = useState('165');

  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('sedentary');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [saving, setSaving] = useState(false);

  // Keep metric + imperial views consistent when the user toggles units.
  const switchUnits = (next: UnitSystem) => {
    if (next === units) return;
    if (next === 'imperial') {
      const cm = Number(heightCm);
      const kg = Number(weightKg);
      if (isFinite(cm)) {
        const { ft, inches } = cmToFtIn(cm);
        setHeightFt(String(ft));
        setHeightIn(String(inches));
      }
      if (isFinite(kg)) setWeightLb(String(Math.round(kgToLb(kg))));
    } else {
      const ft = Number(heightFt);
      const inches = Number(heightIn);
      const lb = Number(weightLb);
      if (isFinite(ft) && isFinite(inches)) setHeightCm(String(Math.round(ftInToCm(ft, inches))));
      if (isFinite(lb)) setWeightKg(String(Math.round(lbToKg(lb) * 10) / 10));
    }
    setUnits(next);
  };

  const onSubmit = async () => {
    const ageN = Number(age);
    let hCm: number;
    let wKg: number;

    if (units === 'imperial') {
      const ft = Number(heightFt);
      const inches = Number(heightIn);
      const lb = Number(weightLb);
      if (!isFinite(ft) || ft < 2 || ft > 8) return Alert.alert('Invalid height (ft)');
      if (!isFinite(inches) || inches < 0 || inches >= 12) return Alert.alert('Invalid height (in)');
      if (!isFinite(lb) || lb < 50 || lb > 900) return Alert.alert('Invalid weight (lb)');
      hCm = ftInToCm(ft, inches);
      wKg = lbToKg(lb);
    } else {
      const hN = Number(heightCm);
      const wN = Number(weightKg);
      if (!isFinite(hN) || hN <= 50 || hN > 260) return Alert.alert('Invalid height (cm)');
      if (!isFinite(wN) || wN <= 20 || wN > 400) return Alert.alert('Invalid weight (kg)');
      hCm = hN;
      wKg = wN;
    }

    if (!name.trim()) return Alert.alert('Missing name', 'Please enter your name.');
    if (!isFinite(ageN) || ageN <= 0 || ageN > 120) return Alert.alert('Invalid age');

    try {
      setSaving(true);
      await setProfile({
        name: name.trim(),
        sex,
        age: ageN,
        heightCm: Math.round(hCm * 10) / 10,
        weightKg: Math.round(wKg * 10) / 10,
        activityLevel,
        goal,
        units,
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

        <Field label="Units">
          <Segmented options={UNITS} value={units} onChange={switchUnits} />
        </Field>

        {units === 'metric' ? (
          <>
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
          </>
        ) : (
          <>
            <Field label="Height">
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={heightFt}
                  onChangeText={setHeightFt}
                  keyboardType="number-pad"
                  placeholder="ft"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={heightIn}
                  onChangeText={setHeightIn}
                  keyboardType="number-pad"
                  placeholder="in"
                />
              </View>
            </Field>
            <Field label="Weight (lb)">
              <TextInput
                style={styles.input}
                value={weightLb}
                onChangeText={setWeightLb}
                keyboardType="decimal-pad"
              />
            </Field>
          </>
        )}

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
