import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { CoachingGroup, listGroups, leaveGroup } from '../api/communication';
import { Action, Card, Copy, ListRow, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import EmptyState from '../components/ui-states/EmptyState';

export default function GroupsScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const [groups, setGroups] = useState<CoachingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setGroups(await listGroups());
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Could not load groups.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}><Skeleton /></View>;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      data={groups}
      keyExtractor={g => g.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      ListEmptyComponent={
        error
          ? <EmptyState title="Couldn't load groups" description={error} />
          : <EmptyState title="No groups yet" description="Your coach can add you to a cohort or challenge group." />
      }
      renderItem={({ item }) => (
        <Card>
          <Copy style={{ fontWeight: "600" }}>{item.name}</Copy>
          <Copy tone="muted" size="caption">
            {item.kind} · {item.members.length} member{item.members.length === 1 ? '' : 's'}
            {item.trainer?.displayName ? ` · Coach ${item.trainer.displayName}` : ''}
          </Copy>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Action label="Open" onPress={() => nav.navigate('GroupChat', { groupId: item.id, name: item.name })} />
            {item.myRole !== 'owner' && (
              <Action label="Leave" secondary onPress={() => { void leaveGroup(item.id).then(load); }} />
            )}
          </View>
        </Card>
      )}
    />
  );
}
