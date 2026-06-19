import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { getMyClients } from '../api/trainers';
import { getDeviceId } from '../storage/device';
import { useRoles } from '../context/RolesContext';
import { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface Client {
  id: string;
  clientId: string;
  status: string;
  assignedAt: string;
  daysWithTrainer?: number;
}

export default function ClientsScreen() {
  const { hasRole } = useRoles();
  const nav = useNavigation<NavProp>();
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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1e6fb8" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#ccc" />
            <Text style={styles.empty}>No clients assigned yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={22} color="#aaa" />
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.clientId} numberOfLines={1}>{item.clientId}</Text>
              <View style={styles.metaRow}>
                <Text style={[styles.status, item.status === 'active' && styles.statusActive]}>
                  {item.status.toUpperCase()}
                </Text>
                {item.daysWithTrainer !== undefined && (
                  <Text style={styles.days}>
                    · {item.daysWithTrainer} day{item.daysWithTrainer !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            </View>
            {isTrainer && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => nav.navigate('ClientProgress', { clientId: item.clientId })}
                >
                  <Ionicons name="stats-chart-outline" size={18} color="#1e6fb8" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => nav.navigate('ClientMealPlan', { clientId: item.clientId })}
                >
                  <Ionicons name="restaurant-outline" size={18} color="#5c8a5c" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.dropBtn]}
                  onPress={() => nav.navigate('TrainerDropForm', { clientId: item.clientId })}
                >
                  <Ionicons name="person-remove-outline" size={18} color="#c0392b" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f9' },
  list: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#c0392b' },
  emptyState: { alignItems: 'center', marginTop: 60 },
  empty: { textAlign: 'center', color: '#888', marginTop: 12, fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  cardLeft: { marginRight: 12 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1 },
  clientId: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  status: { fontSize: 12, fontWeight: '700', color: '#888' },
  statusActive: { color: '#2e7d32' },
  days: { fontSize: 12, color: '#aaa' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8f0fb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropBtn: { backgroundColor: '#ffecec' },
});
