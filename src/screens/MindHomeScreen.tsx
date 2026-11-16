import React, { useCallback, useState } from 'react';
import { ScrollView, View, TextInput, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Action, Card, Copy, ListRow, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import {
  listCheckIns, createCheckIn, listTracks, listExercises, getMindInsights,
  getMindPreferences, updateMindPreferences,
  EmotionalCheckIn, Mood, Track, GuidedExercise, MindInsights, MindPreferences,
} from '../api/mind';

const MOODS: { key: Mood; label: string }[] = [
  { key: 'very_low', label: 'Very low' }, { key: 'low', label: 'Low' },
  { key: 'neutral', label: 'Neutral' }, { key: 'good', label: 'Good' }, { key: 'very_good', label: 'Very good' },
];
const CONTEXTS = ['work', 'family', 'exercise', 'sleep', 'relationships', 'other'];

export default function MindHomeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { isEnabled } = useFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkins, setCheckins] = useState<EmotionalCheckIn[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [exercises, setExercises] = useState<GuidedExercise[]>([]);
  const [insights, setInsights] = useState<MindInsights | null>(null);
  const [prefs, setPrefs] = useState<MindPreferences | null>(null);
  // quick check-in form
  const [mood, setMood] = useState<Mood | null>(null);
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);
  const [journal, setJournal] = useState('');
  const [ctx, setCtx] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [ci, tr, ex, ins, pr] = await Promise.all([
        listCheckIns(14).catch(() => []),
        isEnabled('mindLearningEnabled') ? listTracks().catch(() => []) : Promise.resolve([]),
        isEnabled('mindLearningEnabled') ? listExercises().catch(() => []) : Promise.resolve([]),
        isEnabled('mindBehavioralInsightsEnabled') ? getMindInsights(30).catch(() => null) : Promise.resolve(null),
        getMindPreferences().catch(() => null),
      ]);
      setCheckins(ci); setTracks(tr); setExercises(ex); setInsights(ins); setPrefs(pr);
    } catch (e: any) { setError(e?.message || 'Could not load'); }
    setLoading(false);
  }, [isEnabled]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    if (!mood) { Alert.alert('Pick a mood first'); return; }
    setSaving(true);
    try {
      await createCheckIn({ mood, energy, stress, journal: journal || undefined, contextTags: ctx });
      setMood(null); setJournal(''); setCtx([]); setEnergy(3); setStress(3);
      load();
    } catch (e: any) { Alert.alert('Could not save', e?.message || ''); }
    setSaving(false);
  };

  if (loading && !checkins.length) return <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}><Skeleton /><Skeleton /></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Copy size="heading" style={{ fontWeight: '700' }}>Mind & Habits</Copy>
      <Copy size="caption" tone="muted">Optional, private check-ins and short exercises. Not a diagnostic tool — your journal never leaves your account.</Copy>
      {error ? <Notice error title="Couldn't load" message={error} /> : null}

      {isEnabled('mindEmotionalCheckinsEnabled') && (
        <Card>
          <Copy style={{ fontWeight: '600' }}>Quick check-in</Copy>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MOODS.map((m) => (
              <Action key={m.key} label={m.label} secondary={mood !== m.key} selected={mood === m.key} onPress={() => setMood(m.key)} />
            ))}
          </View>
          <Copy size="caption" tone="muted">Energy {energy}/5 · Stress {stress}/5</Copy>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Action label="− Energy" secondary onPress={() => setEnergy(Math.max(1, energy - 1))} />
            <Action label="+ Energy" secondary onPress={() => setEnergy(Math.min(5, energy + 1))} />
            <Action label="− Stress" secondary onPress={() => setStress(Math.max(1, stress - 1))} />
            <Action label="+ Stress" secondary onPress={() => setStress(Math.min(5, stress + 1))} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {CONTEXTS.map((c) => (
              <Action key={c} label={c} secondary={!ctx.includes(c)} selected={ctx.includes(c)} onPress={() => setCtx(ctx.includes(c) ? ctx.filter((x) => x !== c) : [...ctx, c])} />
            ))}
          </View>
          <TextInput
            value={journal} onChangeText={setJournal} placeholder="Private note (optional — only you can see this)"
            placeholderTextColor={colors.muted} multiline
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.text, minHeight: 60 }}
          />
          <Action label={saving ? 'Saving…' : 'Save check-in'} onPress={save} disabled={saving} />
        </Card>
      )}

      {insights && insights.insights.length > 0 && (
        <Card>
          <Copy style={{ fontWeight: '600' }}>Your patterns</Copy>
          {insights.insights.map((i, k) => (
            <View key={k} style={{ gap: 2 }}>
              <Copy>{i.statement}</Copy>
              <Copy size="caption" tone="muted">{i.sampleSize} observations — an association in your data, not a cause.</Copy>
            </View>
          ))}
        </Card>
      )}
      {insights && insights.dataQuality === 'insufficient' && checkins.length > 0 && (
        <Notice tone='muted'>Keep checking in — patterns appear after {insights.minObservations} check-ins.</Notice>
      )}

      {tracks.length > 0 && (
        <Card>
          <Copy style={{ fontWeight: '600' }}>Emotional intelligence</Copy>
          {tracks.map((t) => (
            <ListRow key={t.key} title={t.title} subtitle={`${t.lessonCount} short lessons`} onPress={() => navigation.navigate('MindTrack', { trackKey: t.key })} />
          ))}
        </Card>
      )}

      {exercises.length > 0 && (
        <Card>
          <Copy style={{ fontWeight: '600' }}>Guided exercises</Copy>
          {exercises.map((e) => (
            <ListRow key={e.key} title={e.title} subtitle={`${Math.round(e.durationSec / 60)} min`} onPress={() => navigation.navigate('MindExercise', { exerciseKey: e.key })} />
          ))}
        </Card>
      )}

      {checkins.length > 0 && (
        <Card>
          <Copy style={{ fontWeight: '600' }}>Recent check-ins</Copy>
          {checkins.slice(0, 7).map((c) => (
            <ListRow key={c.id}
              title={`${c.mood.replace('_', ' ')} · E${c.energy} · S${c.stress}`}
              subtitle={new Date(c.loggedAt).toLocaleDateString() + (c.contextTags.length ? ` · ${c.contextTags.join(', ')}` : '')}
            />
          ))}
        </Card>
      )}

      {prefs && (
        <Card>
          <Copy style={{ fontWeight: '600' }}>Privacy</Copy>
          <ListRow title="Reminders" subtitle={prefs.remindersEnabled ? 'On' : 'Off'} onPress={async () => setPrefs(await updateMindPreferences({ remindersEnabled: !prefs.remindersEnabled }))} />
          <ListRow title="Journal AI processing" subtitle={prefs.aiJournalConsent ? 'Consented' : 'Never without consent'} onPress={async () => setPrefs(await updateMindPreferences({ aiJournalConsent: !prefs.aiJournalConsent }))} />
          <ListRow title="Share check-ins with coach" subtitle={prefs.checkinSharingConsent ? 'Consented' : 'Private'} onPress={async () => setPrefs(await updateMindPreferences({ checkinSharingConsent: !prefs.checkinSharingConsent }))} />
        </Card>
      )}
    </ScrollView>
  );
}
