import React, { useCallback, useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Action, Card, Copy, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { getTrack, completeExercise, TrackDetail } from '../api/mind';

export default function MindTrackScreen() {
  const { colors } = useTheme();
  const { params } = useRoute<any>();
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setTrack(await getTrack(params.trackKey)); } catch { setTrack(null); }
  }, [params.trackKey]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const complete = async (key: string) => {
    setBusy(key);
    try { await completeExercise(key); load(); }
    catch (e: any) { Alert.alert('Could not save', e?.message || ''); }
    setBusy(null);
  };

  if (!track) return <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}><Skeleton /><Skeleton /></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Copy size="heading" style={{ fontWeight: '700' }}>{track.title}</Copy>
      <Copy tone="muted">{track.description}</Copy>
      {track.lessons.map((l) => (
        <Card key={l.key}>
          <Copy style={{ fontWeight: '600' }}>{l.completed ? '✓ ' : ''}{l.title}</Copy>
          <Copy>{l.body}</Copy>
          <Notice tone='muted'>Try it: {l.exercise}</Notice>
          {!l.completed && <Action label={busy === l.key ? 'Saving…' : 'Mark done'} onPress={() => complete(l.key)} disabled={!!busy} />}
        </Card>
      ))}
      <Copy size="caption" tone="muted">{track.attribution}</Copy>
    </ScrollView>
  );
}
