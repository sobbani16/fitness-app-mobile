import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import type { UseScale } from '../hooks/useScale';

interface Props {
  scale: UseScale;
  onWeightLocked?: (grams: number) => void;
}

/**
 * Dumb presentational component — receives a `useScale()` result.
 * Keeps BLE logic out of the UI layer (rule).
 */
export default function ScaleConnectCard({ scale, onWeightLocked }: Props) {
  const { status, reading, stableGrams, error, isMock, connect, disconnect, reset } = scale;

  // Surface the stable weight to the parent once.
  const notifiedRef = React.useRef(false);
  React.useEffect(() => {
    if (stableGrams !== null && !notifiedRef.current && onWeightLocked) {
      notifiedRef.current = true;
      onWeightLocked(stableGrams);
    }
    if (stableGrams === null) notifiedRef.current = false;
  }, [stableGrams, onWeightLocked]);

  const busy = status === 'scanning' || status === 'connecting';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Bluetooth scale</Text>
        {isMock && <Text style={styles.badge}>mock</Text>}
      </View>

      {status === 'idle' && (
        <Text style={styles.muted}>
          Tap connect, place your food on the scale, and the weight will auto-fill.
        </Text>
      )}

      {busy && (
        <View style={styles.row}>
          <ActivityIndicator />
          <Text style={styles.muted}>
            {status === 'scanning' ? 'Searching for scale…' : 'Connecting…'}
          </Text>
        </View>
      )}

      {status === 'connected' && (
        <View>
          <Text style={styles.reading}>
            {reading ? `${reading.grams} g` : 'Waiting for reading…'}
            {reading && !reading.stable && <Text style={styles.muted}>  · stabilizing</Text>}
          </Text>
          {stableGrams !== null && (
            <Text style={styles.lockedText}>Locked at {stableGrams} g</Text>
          )}
        </View>
      )}

      {status === 'error' && (
        <Text style={styles.error}>{error || 'Scale error'}</Text>
      )}

      <View style={styles.actions}>
        {status === 'idle' || status === 'error' ? (
          <Pressable onPress={connect} style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>
              {status === 'error' ? 'Retry' : 'Connect scale'}
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={disconnect} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>Disconnect</Text>
          </Pressable>
        )}
        {(status === 'connected' || status === 'error') && (
          <Pressable onPress={reset} style={styles.btnGhost}>
            <Text style={styles.btnGhostText}>Reset</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fff',
    gap: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  badge: {
    fontSize: 11,
    color: '#1e40af',
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  muted: { color: '#6b7280', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reading: { fontSize: 28, fontWeight: '700', color: '#111827' },
  lockedText: { color: '#15803d', marginTop: 2, fontWeight: '600' },
  error: { color: '#b91c1c', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnPrimary: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
  btnSecondary: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnSecondaryText: { color: '#111827', fontWeight: '600' },
  btnGhost: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnGhostText: { color: '#6b7280', fontWeight: '500' },
});
