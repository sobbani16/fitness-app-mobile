import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CoachingPackage, listTrainerPackages } from '../api/purchases';
import { Action, Card, Copy, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Chip from '../components/Chip';
import EmptyState from '../components/ui-states/EmptyState';

function describe(pkg: CoachingPackage): string {
  const price = `${(pkg.priceCents / 100).toFixed(2)} ${pkg.currency.toUpperCase()}`;
  if (pkg.kind === 'subscription') return `${price} / ${pkg.interval || 'month'}`;
  if (pkg.kind === 'session_pack') return `${price} · ${pkg.sessionCount ?? 0} sessions`;
  return price;
}

/** Read-only list of the trainer's coaching packages (paid coaching flag). */
export default function TrainerPackagesScreen() {
  const { colors } = useTheme();
  const [packages, setPackages] = useState<CoachingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPackages(await listTrainerPackages());
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Could not load packages.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={loading ? [] : packages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 4 }}>
            <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Coaching packages</Copy>
            <Copy tone="muted">Packages your clients can purchase.</Copy>
            {!!error && <Card><Notice error title="Could not load" message={error} /><Action label="Retry" onPress={() => void load()} /></Card>}
          </View>
        }
        ListEmptyComponent={
          loading ? <Skeleton label="Loading your packages" /> : error ? null : (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState title="No packages yet" description="Create subscription, session-pack or one-time packages for clients to buy." />
            </View>
          )
        }
        renderItem={({ item }) => (
          <Card style={{ padding: 14, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Copy style={{ fontWeight: '600' }}>{item.title}</Copy>
              </View>
              <Chip small label={item.active ? 'active' : 'inactive'} accessibilityLabel={item.active ? 'Active' : 'Inactive'} />
            </View>
            <Copy size="caption" tone="muted">{item.kind.replace(/_/g, ' ')} · {describe(item)}</Copy>
          </Card>
        )}
      />
    </View>
  );
}
