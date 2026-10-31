import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Entitlement, listEntitlements } from '../api/purchases';
import { Action, Card, Copy, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Chip from '../components/Chip';
import EmptyState from '../components/ui-states/EmptyState';

function describe(e: Entitlement): string {
  const bits: string[] = [];
  if (e.kind === 'session_pack' || e.kind === 'session') {
    bits.push(`${e.remainingSessions ?? 0} session${e.remainingSessions === 1 ? '' : 's'} left`);
  }
  if (e.expiresAt) bits.push(`expires ${new Date(e.expiresAt).toLocaleDateString()}`);
  if (e.purchase) bits.push(`${(e.purchase.amountCents / 100).toFixed(2)} ${e.purchase.currency.toUpperCase()}`);
  return bits.join(' · ');
}

/** Read-only list of the client's coaching entitlements (paid coaching flag). */
export default function EntitlementsScreen() {
  const { colors } = useTheme();
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setEntitlements(await listEntitlements());
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Could not load entitlements.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={loading ? [] : entitlements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 4 }}>
            <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>My coaching</Copy>
            <Copy tone="muted">Coaching packages and sessions you have access to.</Copy>
            {!!error && <Card><Notice error title="Could not load" message={error} /><Action label="Retry" onPress={() => void load()} /></Card>}
          </View>
        }
        ListEmptyComponent={
          loading ? <Skeleton label="Loading your coaching access" /> : error ? null : (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState title="No coaching access" description="Packages you buy from a coach will appear here." />
            </View>
          )
        }
        renderItem={({ item }) => (
          <Card style={{ padding: 14, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Copy style={{ fontWeight: '600' }}>{item.kind.replace(/_/g, ' ')}</Copy>
              </View>
              <Chip small label={item.status} accessibilityLabel={`Status: ${item.status}`} />
            </View>
            {!!describe(item) && <Copy size="caption" tone="muted">{describe(item)}</Copy>}
          </Card>
        )}
      />
    </View>
  );
}
