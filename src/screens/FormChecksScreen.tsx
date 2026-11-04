import React, { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Action, Card, Copy, Field, ListRow, Notice, Skeleton } from '../design/components';
import Chip from '../components/Chip';
import EmptyState from '../components/ui-states/EmptyState';
import { useTheme } from '../design/theme';
import { useRoles } from '../context/RolesContext';
import { api } from '../api/client';
import {
  listMyFormChecks, listTrainerFormChecks, uploadFormCheckVideo, declineFormCheck,
  acknowledgeFormCheck, addFormCheckFeedback, getFormCheckVideoUrl, FormCheckRequest,
} from '../api/formChecks';

const STATUS_LABEL: Record<string, string> = {
  requested: 'Waiting for your clip', submitted: 'Sent for review', reviewed: 'Feedback ready',
  declined: 'Declined', acknowledged: 'Done',
};

export default function FormChecksScreen() {
  const { colors } = useTheme();
  const { hasRole } = useRoles();
  const isTrainer = hasRole('TRAINER');
  const [requests, setRequests] = useState<FormCheckRequest[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [feedbackTs, setFeedbackTs] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (live = true) => {
    setError(false);
    try {
      const r = isTrainer ? await listTrainerFormChecks() : await listMyFormChecks();
      if (live) setRequests(r.requests);
    } catch { if (live) setError(true); }
    finally { if (live) setLoading(false); }
  }, [isTrainer]);
  useFocusEffect(useCallback(() => { let live = true; setLoading(true); void load(live); return () => { live = false; }; }, [load]));

  async function pickAndUpload(req: FormCheckRequest) {
    if (busy) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return;
    setBusy(true);
    try {
      await uploadFormCheckVideo(req.id, res.assets[0]);
      await load();
    } catch (e: any) {
      Alert.alert('Upload failed', e.response?.status === 413 ? 'The clip is too large — try a shorter recording.' : 'Check your connection and try again.');
    } finally { setBusy(false); }
  }

  async function act(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try { await fn(); await load(); } catch { /* silent — list stays */ }
    finally { setBusy(false); }
  }

  async function openVideo(id: string) {
    try { const r = await getFormCheckVideoUrl(id); await Linking.openURL(`${api.defaults.baseURL}${r.url}`); }
    catch { /* expired/permission — silently stay */ }
  }

  async function sendFeedback(req: FormCheckRequest) {
    const ts = feedbackTs.trim() ? Number(feedbackTs) : undefined;
    await act(() => addFormCheckFeedback(req.id, { timestampSec: ts, note: feedbackNote.trim() }));
    setFeedbackNote(''); setFeedbackTs('');
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
      <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Form checks</Copy>
      <Copy tone="muted" size="caption">{isTrainer ? 'Request short clips and leave timestamped feedback.' : 'Your coach may ask for a short clip to check your form. You choose whether to share it.'}</Copy>
      {loading && <Skeleton label="Loading form checks" />}
      {error && <Notice error title="Couldn't load form checks" message="Check your connection and try again." />}
      {!loading && !error && requests.length === 0 && (
        <EmptyState title="Nothing here yet" description={isTrainer ? 'Requests you send will appear here.' : 'When your coach requests a form check it will appear here.'} />
      )}
      {requests.map((r) => (
        <Card key={r.id}>
          <ListRow title={r.exerciseName ?? 'Form check'} subtitle={STATUS_LABEL[r.status] ?? r.status}
            onPress={() => setOpen(open === r.id ? null : r.id)}>
            <Chip small label={r.status} accessibilityLabel={`Status ${STATUS_LABEL[r.status] ?? r.status}`} />
          </ListRow>
          {!!r.note && <Copy size="caption" tone="muted">{r.note}</Copy>}
          {open === r.id && (
            <View style={{ gap: 8 }}>
              {r.feedback.map((f) => (
                <View key={f.id}><Copy>{f.timestampSec != null ? `@${f.timestampSec}s — ` : ''}{f.note}</Copy>
                  <Copy size="caption" tone="muted">{f.createdAt.slice(0, 10)}</Copy></View>
              ))}
              {r.videoName && <Action secondary label={`Watch clip (${(r.videoBytes ? `${Math.round(r.videoBytes / 1048576)}MB` : 'video')})`} onPress={() => void openVideo(r.id)} />}
              {!isTrainer && (r.status === 'requested' || r.status === 'submitted') && (
                <>
                  <Action label={busy ? 'Uploading…' : 'Record or pick a clip'} disabled={busy} onPress={() => void pickAndUpload(r)} />
                  <Copy size="caption" tone="muted">Uploading shares this clip with your coach — your consent is recorded.</Copy>
                  {r.status === 'requested' && <Action secondary label="Decline" disabled={busy} onPress={() => void act(() => declineFormCheck(r.id))} />}
                </>
              )}
              {!isTrainer && r.status === 'reviewed' && <Action secondary label="Got it — mark reviewed" disabled={busy} onPress={() => void act(() => acknowledgeFormCheck(r.id))} />}
              {isTrainer && r.status === 'submitted' && (
                <>
                  <Field label="Timestamp (sec, optional)" value={feedbackTs} onChangeText={setFeedbackTs} keyboardType="decimal-pad" placeholder="e.g. 12.5" />
                  <Field label="Feedback" value={feedbackNote} onChangeText={setFeedbackNote} multiline placeholder="What did you see at that point in the clip?" />
                  <Action label={busy ? 'Sending…' : 'Send feedback'} disabled={busy || !feedbackNote.trim()} onPress={() => void sendFeedback(r)} />
                </>
              )}
            </View>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}
