import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';
import { SharedDocument, listSharedDocuments, getDocumentUrl } from '../api/communication';
import { Action, Card, Copy, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { resolveApiUrl } from '../config/apiUrl';
import { getSession } from '../storage/session';
import EmptyState from '../components/ui-states/EmptyState';

const CATEGORY_LABELS: Record<string, string> = {
  nutrition: 'Nutrition', workout: 'Workout', meal_plan: 'Meal plan',
  exercise: 'Exercise', progress: 'Progress', education: 'Education',
};

export default function DocumentsScreen() {
  const { colors } = useTheme();
  const [docs, setDocs] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDocs(await listSharedDocuments());
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Could not load documents.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const open = async (d: SharedDocument) => {
    setBusyId(d.id);
    try {
      const { url } = await getDocumentUrl(d.id);
      const base = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL, __DEV__);
      const token = getSession()?.token;
      const target = `${FileSystem.Paths.cache.uri}${d.fileName}`;
      // Download with the bearer token — the signed URL is also bound to this user.
      const res = await FileSystem.downloadAsync(`${base}/communication${url}`, target,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.status !== 200) throw new Error(`Download failed (${res.status}).`);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf' });
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not open document.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}><Skeleton /></View>;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      data={docs}
      keyExtractor={d => d.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      ListEmptyComponent={
        error
          ? <EmptyState title="Couldn't load documents" description={error} />
          : <EmptyState title="No documents" description="Your coach's shared guides and PDFs appear here." />
      }
      renderItem={({ item }) => (
        <Card>
          <Copy style={{ fontWeight: "600" }}>{item.title}</Copy>
          <Copy tone="muted" size="caption">
            {CATEGORY_LABELS[item.category] || item.category} · v{item.version} · {Math.round(item.sizeBytes / 1024)} KB
            {item.trainer?.displayName ? ` · ${item.trainer.displayName}` : ''}
          </Copy>
          <View style={{ marginTop: 8 }}>
            <Action label={busyId === item.id ? 'Opening…' : 'View PDF'} onPress={() => void open(item)} disabled={busyId === item.id} />
          </View>
        </Card>
      )}
    />
  );
}
