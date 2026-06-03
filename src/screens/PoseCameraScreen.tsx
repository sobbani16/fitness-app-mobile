import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  LayoutChangeEvent,
} from 'react-native';
import PoseCameraView from '../components/PoseCameraView';
import PoseOverlay from '../components/PoseOverlay';
import type { UseExerciseDetection } from '../hooks/useExerciseDetection';

interface Props {
  visible: boolean;
  onClose: () => void;
  detection: UseExerciseDetection;
}

/**
 * Full-screen modal that mounts the pose camera while detection is active.
 * Pure presentation — takes the `useExerciseDetection` result as a prop.
 */
export default function PoseCameraScreen({ visible, onClose, detection }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const posture = detection.posture;
  const formOk = posture?.overallOk ?? false;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.root} onLayout={onLayout}>
        <PoseCameraView onError={(m) => console.warn('[PoseCamera]', m)} />

        {posture && size.width > 0 && (
          <PoseOverlay assessment={posture} width={size.width} height={size.height} />
        )}

        <SafeAreaView style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topBar}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {detection.status === 'running' ? 'Counting' : detection.status}
              </Text>
            </View>
            {detection.isMock && (
              <View style={styles.demoBadge}>
                <Text style={styles.badgeText}>Form demo</Text>
              </View>
            )}
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Done</Text>
            </Pressable>
          </View>

          {posture && (
            <View
              style={[
                styles.formBanner,
                { backgroundColor: formOk ? 'rgba(34,197,94,0.92)' : 'rgba(239,68,68,0.92)' },
              ]}
            >
              <Text style={styles.formBannerText}>
                {formOk ? '✓ ' : '⚠ '}
                {posture.message}
              </Text>
            </View>
          )}

          <View style={styles.bottomBar}>
            <Text style={styles.repCount}>{detection.reps}</Text>
            <Text style={styles.repLabel}>reps</Text>
            {detection.error && (
              <Text style={styles.error}>{detection.error}</Text>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  badge: {
    backgroundColor: 'rgba(21, 128, 61, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: { color: '#fff', fontWeight: '700' },
  demoBadge: {
    backgroundColor: 'rgba(59,130,246,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  formBanner: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '90%',
  },
  formBannerText: { color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  closeBtnText: { color: '#111', fontWeight: '700' },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: 36,
    gap: 2,
  },
  repCount: {
    color: '#fff',
    fontSize: 96,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 8,
  },
  repLabel: { color: '#fff', fontSize: 18, fontWeight: '600', opacity: 0.9 },
  error: { color: '#fca5a5', marginTop: 8 },
});
