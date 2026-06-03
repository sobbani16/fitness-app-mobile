import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Pressable, Alert } from 'react-native';
import KeyboardAwareScrollView from './KeyboardAwareScrollView';
import {
  ActivityLevel,
  Goal,
  Profile,
  Sex,
  UnitSystem,
} from '../storage/profile';
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from '../util/units';

const SEXES: Sex[] = ['male', 'female', 'other'];
const ACTIVITY: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const GOALS: Goal[] = ['lose', 'maintain', 'gain'];
const UNITS: UnitSystem[] = ['metric', 'imperial'];

export type ProfileFormData = Omit<Profile, 'createdAt'>;

interface Props {
  initial?: Partial<Profile> | null;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  saving?: boolean;
  onSubmit: (data: ProfileFormData) => void | Promise<void>;
}

/**
 * Shared profile editor used by both Onboarding and Edit Profile.
 * Stores canonical metric values; converts only for display/input.
 */
export default function ProfileForm({
  initial,
  title = 'Welcome',
  subtitle = "Tell us a bit about you. We'll use this to set your daily calorie target.",
  submitLabel = 'Continue',
  saving = false,
  onSubmit,
}: Props) {
  const initUnits = initial?.units ?? 'metric';

  const [name, setName] = useState(initial?.name ?? '');
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'male');
  const [age, setAge] = useState(String(initial?.age ?? '30'));
  const [units, setUnits] = useState<UnitSystem>(initUnits);

  const initHeightCm = initial?.heightCm ?? 175;
  const initWeightKg = initial?.weightKg ?? 75;
  const initGoalKg = initial?.goalWeightKg ?? initWeightKg;

  const [heightCm, setHeightCm] = useState(String(initHeightCm));
  const [weightKg, setWeightKg] = useState(String(initWeightKg));
  const [goalWeightKg, setGoalWeightKg] = useState(String(initGoalKg));

  const initFtIn = cmToFtIn(initHeightCm);
  const [heightFt, setHeightFt] = useState(String(initFtIn.ft));
  const [heightIn, setHeightIn] = useState(String(initFtIn.inches));
  const [weightLb, setWeightLb] = useState(String(Math.round(kgToLb(initWeightKg))));
  const [goalWeightLb, setGoalWeightLb] = useState(String(Math.round(kgToLb(initGoalKg))));

  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    initial?.activityLevel ?? 'sedentary',
  );
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? 'maintain');

  const switchUnits = (next: UnitSystem) => {
    if (next === units) return;
    if (next === 'imperial') {
      const cm = Number(heightCm);
      const kg = Number(weightKg);
      const gkg = Number(goalWeightKg);
      if (isFinite(cm)) {
        const { ft, inches } = cmToFtIn(cm);
        setHeightFt(String(ft));
        setHeightIn(String(inches));
      }
      if (isFinite(kg)) setWeightLb(String(Math.round(kgToLb(kg))));
      if (isFinite(gkg)) setGoalWeightLb(String(Math.round(kgToLb(gkg))));
    } else {
      const ft = Number(heightFt);
      const inches = Number(heightIn);
      const lb = Number(weightLb);
      const glb = Number(goalWeightLb);
      if (isFinite(ft) && isFinite(inches)) setHeightCm(String(Math.round(ftInToCm(ft, inches))));
      if (isFinite(lb)) setWeightKg(String(Math.round(lbToKg(lb) * 10) / 10));
      if (isFinite(glb)) setGoalWeightKg(String(Math.round(lbToKg(glb) * 10) / 10));
    }
    setUnits(next);
  };

  const handleSubmit = async () => {
    const ageN = Number(age);
    let hCm: number;
    let wKg: number;
    let gKg: number;

    if (units === 'imperial') {
      const ft = Number(heightFt);
      const inches = Number(heightIn);
      const lb = Number(weightLb);
      const glb = Number(goalWeightLb);
      if (!isFinite(ft) || ft < 2 || ft > 8) return Alert.alert('Invalid height (ft)');
      if (!isFinite(inches) || inches < 0 || inches >= 12) return Alert.alert('Invalid height (in)');
      if (!isFinite(lb) || lb < 50 || lb > 900) return Alert.alert('Invalid weight (lb)');
      if (!isFinite(glb) || glb < 50 || glb > 900) return Alert.alert('Invalid goal weight (lb)');
      hCm = ftInToCm(ft, inches);
      wKg = lbToKg(lb);
      gKg = lbToKg(glb);
    } else {
      const hN = Number(heightCm);
      const wN = Number(weightKg);
      const gN = Number(goalWeightKg);
      if (!isFinite(hN) || hN <= 50 || hN > 260) return Alert.alert('Invalid height (cm)');
      if (!isFinite(wN) || wN <= 20 || wN > 400) return Alert.alert('Invalid weight (kg)');
      if (!isFinite(gN) || gN <= 20 || gN > 400) return Alert.alert('Invalid goal weight (kg)');
      hCm = hN;
      wKg = wN;
      gKg = gN;
    }

    if (!name.trim()) return Alert.alert('Missing name', 'Please enter your name.');
    if (!isFinite(ageN) || ageN <= 0 || ageN > 120) return Alert.alert('Invalid age');

    await onSubmit({
      name: name.trim(),
      sex,
      age: ageN,
      heightCm: Math.round(hCm * 10) / 10,
      weightKg: Math.round(wKg * 10) / 10,
      goalWeightKg: Math.round(gKg * 10) / 10,
      activityLevel,
      goal,
      units,
    });
  };

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

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
        <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" />
      </Field>

      <Field label="Units">
        <Segmented options={UNITS} value={units} onChange={switchUnits} />
      </Field>

      {units === 'metric' ? (
        <>
          <Field label="Height (cm)">
            <TextInput style={styles.input} value={heightCm} onChangeText={setHeightCm} keyboardType="number-pad" />
          </Field>
          <Field label="Current weight (kg)">
            <TextInput style={styles.input} value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" />
          </Field>
          <Field label="Goal weight (kg)">
            <TextInput style={styles.input} value={goalWeightKg} onChangeText={setGoalWeightKg} keyboardType="decimal-pad" />
          </Field>
        </>
      ) : (
        <>
          <Field label="Height">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[styles.input, { flex: 1 }]} value={heightFt} onChangeText={setHeightFt} keyboardType="number-pad" placeholder="ft" />
              <TextInput style={[styles.input, { flex: 1 }]} value={heightIn} onChangeText={setHeightIn} keyboardType="number-pad" placeholder="in" />
            </View>
          </Field>
          <Field label="Current weight (lb)">
            <TextInput style={styles.input} value={weightLb} onChangeText={setWeightLb} keyboardType="decimal-pad" />
          </Field>
          <Field label="Goal weight (lb)">
            <TextInput style={styles.input} value={goalWeightLb} onChangeText={setGoalWeightLb} keyboardType="decimal-pad" />
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
      <Button title={saving ? 'Saving…' : submitLabel} onPress={handleSubmit} disabled={saving} />
      <View style={{ height: 24 }} />
    </KeyboardAwareScrollView>
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
  segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: {
    borderWidth: 1,
    borderColor: '#d0d0d5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  segmentActive: { backgroundColor: '#1e6fb8', borderColor: '#1e6fb8' },
  segmentText: { color: '#222', fontSize: 14 },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
});
