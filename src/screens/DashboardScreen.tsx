import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getHealth } from '../api/health';

export default function DashboardScreen() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [detail, setDetail] = useState<string>('');

  useEffect(() => {
    getHealth()
      .then((res) => {
        setStatus('ok');
        setDetail(res.time ?? '');
      })
      .catch((err) => {
        setStatus('error');
        setDetail(err?.message ?? 'Unknown error');
      });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.label}>Backend status:</Text>
      {status === 'loading' && <ActivityIndicator />}
      {status === 'ok' && <Text style={styles.ok}>OK — {detail}</Text>}
      {status === 'error' && <Text style={styles.err}>ERROR — {detail}</Text>}
      <Text style={styles.placeholder}>Calories consumed vs burned — coming next.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  label: { fontSize: 14, color: '#555' },
  ok: { color: 'green', fontWeight: '600' },
  err: { color: 'red', fontWeight: '600' },
  placeholder: { marginTop: 24, color: '#777' },
});
