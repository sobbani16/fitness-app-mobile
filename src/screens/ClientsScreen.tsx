import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../api/client';
import { getDeviceId } from '../storage/device';
import { useRoles } from '../context/RolesContext';

interface Client {
  id: string;
  clientId: string;
  status: string;
  assignedAt: string;
}

export default function ClientsScreen() {
  const { hasRole } = useRoles();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const userId = await getDeviceId();
        const endpoint = hasRole('TRAINER')
          ? '/trainers/me/clients'
          : '/nutritionists/me/clients';
        const res = await api.get(endpoint, { headers: { 'x-user-id': userId } });
        setClients(res.data.clients || []);
      } catch (e: any) {
        setError(e.response?.data?.error || e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [hasRole]);

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No clients assigned yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.clientId}>{item.clientId}</Text>
            <Text style={[styles.status, item.status === 'active' && styles.statusActive]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f7f7f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#c0392b' },
  empty: { textAlign: 'center', color: '#666', marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  clientId: { fontSize: 14, fontWeight: '600', color: '#222' },
  status: { fontSize: 12, fontWeight: '700', color: '#888' },
  statusActive: { color: '#2e7d32' },
});
