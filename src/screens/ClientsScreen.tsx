import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { getMyClients } from '../api/trainers';
import { getDeviceId } from '../storage/device';
import { useRoles } from '../context/RolesContext';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Action, Card, Copy, IconAction, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Avatar from '../components/Avatar';
import EmptyState from '../components/ui-states/EmptyState';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface Client {
  id: string;
  clientId: string;
  displayName?: string;
  status: string;
  assignedAt: string;
  daysWithTrainer?: number;
}

export default function ClientsScreen() {
  const { hasRole } = useRoles();
  const { isEnabled } = useFeatureFlags();
  const nav = useNavigation<NavProp>();
  const { colors } = useTheme();
  const isTrainer = hasRole('TRAINER');

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (isTrainer) {
        const data = await getMyClients();
        setClients(data.clients);
      } else {
        const userId = await getDeviceId();
        const res = await api.get('/nutritionists/me/clients', { headers: { 'x-user-id': userId } });
        setClients(res.data.clients || []);
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isTrainer]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, gap: 16 }}>
        <Skeleton label="Loading clients" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24, gap: 12 }}>
        <Notice error title="Could not load clients" message={error} />
        <Action label="Retry" onPress={load} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          isTrainer ? (
            <View style={{ gap: 8, marginBottom: 4 }}>
              {isEnabled('trainerCoaching') && (
                <Action secondary label="Coaching requests" onPress={() => nav.navigate('CoachingRequests')} />
              )}
              {isEnabled('trainerAdvancedFeaturesEnabled') && (
                <Action secondary label="Coaching hub" onPress={() => nav.navigate('CoachingHub')} />
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState title="No clients assigned yet" description="Clients assigned to you will appear here." />
          </View>
        }
        renderItem={({ item }) => {
          const name = item.displayName ?? item.clientId;
          const active = item.status === 'active';
          return (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
              <Avatar name={item.displayName} size={44} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Copy style={{ fontWeight: '700' }} numberOfLines={1}>{name}</Copy>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Copy size="caption" tone={active ? 'primary' : 'muted'} style={{ fontWeight: '700' }}>
                    {item.status.toUpperCase()}
                  </Copy>
                  {item.daysWithTrainer !== undefined && (
                    <Copy size="caption" tone="muted">
                      · {item.daysWithTrainer} day{item.daysWithTrainer !== 1 ? 's' : ''}
                    </Copy>
                  )}
                </View>
              </View>
              {isTrainer && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <IconAction icon="📊" label={`View progress for ${name}`}
                    onPress={() => nav.navigate('ClientProgress', { clientId: item.clientId })} />
                  <IconAction icon="🍽" label={`View meal plan for ${name}`}
                    onPress={() => nav.navigate('ClientMealPlan', { clientId: item.clientId })} />
                  <IconAction icon="✕" danger label={`Remove client ${name}`}
                    onPress={() => nav.navigate('TrainerDropForm', { clientId: item.clientId })} />
                </View>
              )}
            </Card>
          );
        }}
      />
    </View>
  );
}
