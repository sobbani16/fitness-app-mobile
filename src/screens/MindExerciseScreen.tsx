import React, { useCallback, useState } from 'react';
import { ScrollView, View, TextInput, Alert } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Action, Card, Copy, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { listExercises, completeExercise, GuidedExercise } from '../api/mind';

export default function MindExerciseScreen() {
  const { colors } = useTheme();
  const { params } = useRoute<any>();
  const [exercise, setExercise] = useState<GuidedExercise | null>(null);
  const [reflection, setReflection] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useFocusEffect(useCallback(() => {
    listExercises().then((xs) => setExercise(xs.find((x) => x.key === params.exerciseKey) || null)).catch(() => {});
  }, [params.exerciseKey]));

  const complete = async () => {
    setBusy(true);
    try { await completeExercise(params.exerciseKey, reflection || undefined); setDone(true); }
    catch (e: any) { Alert.alert('Could not save', e?.message || ''); }
    setBusy(false);
  };

  if (!exercise) return <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}><Skeleton /></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Copy size="heading" style={{ fontWeight: '700' }}>{exercise.title}</Copy>
      <Copy tone="muted">About {Math.round(exercise.durationSec / 60)} minute{exercise.durationSec >= 120 ? 's' : ''}</Copy>
      <Card>
        {exercise.steps.map((s, i) => <Copy key={i}>{i + 1}. {s}</Copy>)}
      </Card>
      {done ? (
        <Copy size="caption" tone="primary">Done — nice work.</Copy>
      ) : (
        <Card>
          <TextInput value={reflection} onChangeText={setReflection} placeholder="One-line reflection (optional)"
            placeholderTextColor={colors.muted}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.text }} />
          <Action label={busy ? 'Saving…' : 'Complete'} onPress={complete} disabled={busy} />
        </Card>
      )}
    </ScrollView>
  );
}
