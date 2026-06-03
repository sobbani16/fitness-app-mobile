import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import ExercisePicker from '../components/ExercisePicker';
import WeightStepper from '../components/WeightStepper';
import SetList from '../components/SetList';
import { useExerciseSession } from '../hooks/useExerciseSession';
import { useExerciseDetection } from '../hooks/useExerciseDetection';
import { EXERCISE_TYPES } from '../types/exercise';
import PoseCameraScreen from './PoseCameraScreen';

export default function LogExerciseScreen() {
  const {
    exerciseType,
    setExerciseType,
    sets,
    prefill,
    suggestedWeight,
    loading,
    saving,
    error,
    addSet,
    reset,
  } = useExerciseSession(EXERCISE_TYPES[0]);

  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState<number | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const detection = useExerciseDetection();

  // Keep the local weight field synced with the autofill suggestion
  // whenever the underlying suggestion changes (e.g. after saving a set
  // or switching exercise). The user can still freely edit it.
  useEffect(() => {
    setWeight(suggestedWeight);
  }, [suggestedWeight]);

  // When the detection engine counts reps, mirror into the reps field.
  useEffect(() => {
    if (detection.status === 'running' && detection.reps > 0) {
      setReps(String(detection.reps));
    }
  }, [detection.reps, detection.status]);

  // If a weight estimate arrives and the user hasn't set one yet,
  // offer it as the default (kg assumed — the stepper is unit-agnostic).
  useEffect(() => {
    if (
      detection.suggestedWeightKg !== null &&
      (weight === null || weight === 0)
    ) {
      setWeight(detection.suggestedWeightKg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detection.suggestedWeightKg]);

  const toggleDetection = async () => {
    if (detection.status === 'running') {
      await detection.stop();
      setCameraVisible(false);
    } else {
      await detection.start(exerciseType);
      // Always open the form-check overlay. With the real engine it draws the
      // live pose; in mock mode it animates a form demo so the UX is testable
      // in Expo Go.
      setCameraVisible(true);
    }
  };

  const closeCamera = async () => {
    setCameraVisible(false);
    await detection.stop();
  };

  const canSave =
    !saving && Number(reps) > 0 && weight !== null && weight >= 0;

  const onSave = async () => {
    const r = Number(reps);
    const w = Number(weight ?? 0);
    await addSet(r, w);
  };

  return (
    <>
    <PoseCameraScreen
      visible={cameraVisible}
      onClose={closeCamera}
      detection={detection}
    />
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Log exercise</Text>
        <Text style={styles.subtitle}>Pick an exercise, then log each set.</Text>

        <View style={styles.sectionTight}>
          <ExercisePicker value={exerciseType} onChange={setExerciseType} />
        </View>

        <View style={styles.card}>
          <View style={styles.historyRow}>
            {loading ? (
              <ActivityIndicator />
            ) : prefill && prefill.suggestedWeight !== null ? (
              <Text style={styles.muted}>
                Last time: {prefill.suggestedWeight} · {prefill.lastSetCount} set
                {prefill.lastSetCount === 1 ? '' : 's'}
              </Text>
            ) : (
              <Text style={styles.muted}>No previous sessions for this exercise.</Text>
            )}
          </View>

          <Text style={styles.label}>Reps</Text>
          <TextInput
            style={styles.input}
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            placeholder="Reps"
          />

          <WeightStepper value={weight} onChange={setWeight} />

          <View style={styles.detectRow}>
            <Pressable
              onPress={toggleDetection}
              style={[
                styles.detectBtn,
                detection.status === 'running' && styles.detectBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.detectBtnText,
                  detection.status === 'running' && styles.detectBtnTextActive,
                ]}
              >
                {detection.status === 'running'
                  ? `Stop · ${detection.reps} reps`
                  : 'Auto-count reps & check form'}
              </Text>
            </Pressable>
            {detection.isMock && (
              <Text style={styles.mockTag}>mock</Text>
            )}
          </View>
          {detection.error && (
            <Text style={styles.error}>{detection.error}</Text>
          )}

          <Pressable
            onPress={onSave}
            disabled={!canSave}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving…' : sets.length === 0 ? 'Log first set' : 'Log next set'}
            </Text>
          </Pressable>

          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <View style={styles.section}>
          <View style={styles.setsHeader}>
            <Text style={styles.sectionTitle}>This session</Text>
            {sets.length > 0 && (
              <Pressable onPress={reset}>
                <Text style={styles.link}>Start new</Text>
              </Pressable>
            )}
          </View>
          <SetList sets={sets} />
        </View>
    </KeyboardAwareScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 12 },
  sectionTight: { marginHorizontal: -16 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  setsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: '#2563eb', fontWeight: '500' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  historyRow: { marginBottom: 8 },
  muted: { color: '#6b7280', fontSize: 13 },
  label: { fontSize: 13, color: '#4b5563', marginBottom: 6, marginTop: 8 },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  saveBtn: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#93c5fd' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#b91c1c', marginTop: 8, fontSize: 13 },
  detectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  detectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  detectBtnActive: {
    backgroundColor: '#15803d',
    borderColor: '#15803d',
  },
  detectBtnText: { color: '#111827', fontWeight: '600' },
  detectBtnTextActive: { color: '#fff' },
  mockTag: {
    fontSize: 11,
    color: '#1e40af',
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
});
