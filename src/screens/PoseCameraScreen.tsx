import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  LayoutChangeEvent,
} from 'react-native';
import * as Speech from 'expo-speech';
import PoseCameraView from '../components/PoseCameraView';
import PoseOverlay from '../components/PoseOverlay';
import type { UseExerciseDetection } from '../hooks/useExerciseDetection';

interface Props {
  visible: boolean;
  onClose: () => void;
  detection: UseExerciseDetection;
}

/**
 * Full-screen modal with:
 * - Real pose detection camera (front/back toggle)
 * - Voice commands (reads form feedback aloud)
 * - Rep counter
 */
export default function PoseCameraScreen({ visible, onClose, detection }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const lastSpokenRef = useRef('');

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const posture = detection.posture;
  const formOk = posture?.overallOk ?? false;

  // Voice commands — speak posture feedback when it changes
  useEffect(() => {
    if (!voiceEnabled || !posture?.message) return;
    if (posture.message === lastSpokenRef.current) return;
    lastSpokenRef.current = posture.message;
    Speech.speak(posture.message, { rate: 1.0, pitch: 1.0 });
  }, [posture?.message, voiceEnabled]);

  // Speak rep count on change
  useEffect(() => {
    if (!voiceEnabled || detection.reps === 0) return;
    Speech.speak(`${detection.reps}`, { rate: 1.2, pitch: 1.0 });
  }, [detection.reps, voiceEnabled]);

  // Stop speech when closing
  const handleClose = () => {
    Speech.stop();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.root} onLayout={onLayout}>
        <PoseCameraView facing={facing} onError={(m) => console.warn('[PoseCamera]', m)} />

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

            {/* Camera flip button */}
            <Pressable
              style={styles.flipBtn}
              onPress={() => setFacing((f) => f === 'back' ? 'front' : 'back')}
            >
              <Text style={styles.flipBtnText}>🔄</Text>
            </Pressable>

            {/* Voice toggle */}
            <Pressable
              style={[styles.voiceBtn, !voiceEnabled && styles.voiceBtnOff]}
              onPress={() => { setVoiceEnabled((v) => !v); if (voiceEnabled) Speech.stop(); }}
            >
              <Text style={styles.voiceBtnText}>{voiceEnabled ? '🔊' : '🔇'}</Text>
            </Pressable>

            <Pressable onPress={handleClose} style={styles.closeBtn}>
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
  flipBtn: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipBtnText: { fontSize: 20 },
  voiceBtn: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBtnOff: { backgroundColor: 'rgba(255,255,255,0.5)' },
  voiceBtnText: { fontSize: 20 },
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
