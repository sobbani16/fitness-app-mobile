import React, { useEffect, useState, useCallback } from 'react';
import { Alert, FlatList, RefreshControl, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  acceptTrainerRequest,
  declineTrainerRequest,
  getIncomingRequests,
  getMyRequests,
  TrainerRequest,
} from '../api/trainerRequests';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useRoles } from '../context/RolesContext';
import { Action, Card, Copy, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Avatar from '../components/Avatar';
import EmptyState from '../components/ui-states/EmptyState';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function requestedAgo(r: TrainerRequest): string | null {
  if (r.requestedAgo) return r.requestedAgo;
  const stamp = r.requestedAt ?? r.createdAt;
  if (!stamp) return null;
  const then = new Date(stamp).getTime();
  if (Number.isNaN(then)) return null;
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export default function CoachingRequestsScreen() {
  const nav = useNavigation<NavProp>();
  const { colors } = useTheme();
  const { hasRole, loading: rolesLoading } = useRoles();
  const isTrainer = hasRole('TRAINER');

  const [requests, setRequests] = useState<TrainerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = isTrainer ? await getIncomingRequests() : await getMyRequests();
      setRequests(data);
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isTrainer]);

  useEffect(() => {
    if (!rolesLoading) load();
  }, [load, rolesLoading]);

  const act = async (id: string, fn: (id: string) => Promise<any>, failure: string) => {
    setBusyId(id);
    try {
      await fn(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      Alert.alert(failure, e.response?.data?.error ?? e.message);
    } finally {
      setBusyId(null);
    }
  };

  const party = (r: TrainerRequest) => isTrainer
    ? { name: r.client?.displayName ?? r.clientName ?? r.clientId ?? 'Client', uri: r.client?.profilePicture ?? r.clientAvatar }
    : { name: r.trainer?.displayName ?? r.trainerName ?? r.trainerId ?? 'Trainer', uri: r.trainer?.profilePicture ?? r.trainerAvatar };

  if (loading || rolesLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, gap: 16 }}>
        <Skeleton label="Loading coaching requests" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24, gap: 12 }}>
        <Notice error title="Could not load requests" message={error} />
        <Action label="Retry" onPress={load} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <Copy tone="muted">
            {isTrainer
              ? 'Clients who asked to work with you. Accept to start coaching, or decline to let them keep looking.'
              : 'Requests you have sent to trainers. You can cancel a request while it is still pending.'}
          </Copy>
        }
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState
              title={isTrainer ? 'No pending requests' : 'No outgoing requests'}
              description={isTrainer
                ? 'When a client requests you as their trainer, it will appear here.'
                : 'Find a trainer and send a request — it will show up here while it awaits a response.'}
              primaryCTA={isTrainer ? undefined : 'Browse trainers'}
              onAction={isTrainer ? undefined : () => nav.navigate('TrainerList')}
            />
          </View>
        }
        renderItem={({ item }) => {
          const { name, uri } = party(item);
          const ago = requestedAgo(item);
          const busy = busyId === item.id;
          return (
            <Card style={{ gap: 12, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar uri={uri} name={name} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Copy style={{ fontWeight: '700' }} numberOfLines={1}>{name}</Copy>
                  <Copy size="caption" tone="muted">
                    {isTrainer ? 'Wants you as their trainer' : 'Awaiting trainer response'}
                    {ago ? ` · ${ago}` : ''}
                  </Copy>
                </View>
              </View>
              {isTrainer ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Action label={busy ? 'Working…' : 'Accept'} disabled={busy}
                      onPress={() => act(item.id, acceptTrainerRequest, 'Could not accept request')} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Action secondary label="Decline" disabled={busy}
                      onPress={() => act(item.id, declineTrainerRequest, 'Could not decline request')} />
                  </View>
                </View>
              ) : (
                <Action secondary label={busy ? 'Cancelling…' : 'Cancel request'} disabled={busy}
                  onPress={() => act(item.id, declineTrainerRequest, 'Could not cancel request')} />
              )}
            </Card>
          );
        }}
      />
    </View>
  );
}
