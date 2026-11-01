import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  VideoSession, listVideoSessions, joinVideoSession, cancelVideoSession,
  setRecordingConsent, getSessionSummary,
} from '../api/communication';
import { Action, Card, Copy, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import EmptyState from '../components/ui-states/EmptyState';

function fmt(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function VideoSessionsScreen() {
  const { colors } = useTheme();
  const [sessions, setSessions] = useState<VideoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSessions(await listVideoSessions());
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Could not load sessions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const join = async (s: VideoSession) => {
    setBusyId(s.id);
    try {
      const res = await joinVideoSession(s.id);
      if (res.provider === 'livekit') {
        // Provider room UI lands with the LiveKit SDK integration; credentials
        // are already participant-scoped and short-lived.
        setNotice(`Room credential issued (expires ${new Date(res.expiresAt).toLocaleTimeString()}).`);
      } else {
        setNotice('Video rooms activate when the provider is configured. Your join credential is ready.');
      }
      void load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not join.');
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (s: VideoSession) => {
    setBusyId(s.id);
    try { await cancelVideoSession(s.id); setNotice('Session canceled.'); void load(); }
    catch (e: any) { setError(e.response?.data?.error || 'Could not cancel.'); }
    finally { setBusyId(null); }
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}><Skeleton /></View>;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      data={sessions}
      keyExtractor={s => s.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      ListHeaderComponent={notice ? <Notice title="Video sessions" message={notice} /> : error ? <Notice title="Video sessions" message={error} error /> : null}
      ListEmptyComponent={<EmptyState title="No sessions" description="Scheduled video consultations appear here." />}
      renderItem={({ item }) => {
        const open = item.status === 'scheduled' || item.status === 'live';
        return (
          <Card>
            <Copy style={{ fontWeight: "600" }}>{fmt(item.scheduledStart)}</Copy>
            <Copy tone="muted" size="caption">
              {item.status}{item.recordingRequested ? ' · recording' : ''}{item.purpose ? ` · ${item.purpose}` : ''}
            </Copy>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {open && (
                <>
                  <Action label={busyId === item.id ? 'Joining…' : 'Join'} onPress={() => void join(item)} disabled={busyId === item.id} />
                  <Action label="Cancel" secondary onPress={() => void cancel(item)} disabled={busyId === item.id} />
                  <Action label="Consent to record" secondary
                    onPress={() => void setRecordingConsent(item.id, true).then(load).catch(() => setError('Could not save consent.'))} />
                </>
              )}
              {item.status === 'ended' && <SessionSummary sessionId={item.id} />}
            </View>
          </Card>
        );
      }}
    />
  );
}

function SessionSummary({ sessionId }: { sessionId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  if (summary) return <Copy size="caption">{summary}</Copy>;
  return (
    <Action label="Summary" secondary onPress={() => {
      void getSessionSummary(sessionId)
        .then(s => setSummary(s?.memberSummary || 'No published summary yet.'))
        .catch(() => { setTried(true); setSummary('No published summary yet.'); });
    }} disabled={tried} />
  );
}
