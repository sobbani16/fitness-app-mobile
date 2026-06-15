import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { loadPoseDetector } from '../detection/pose/poseDetectorLoader';
import { getRealEngine } from '../detection/realEngine';
import { Worklets } from 'react-native-worklets-core';

interface Props {
  /** Fired when permission is denied or the camera can't initialize. */
  onError?: (msg: string) => void;
  /** 'front' or 'back' camera. Defaults to 'back'. */
  facing?: 'front' | 'back';
}

/**
 * Mounts the VisionCamera and pipes pose keypoints into the real engine.
 *
 * ⚠️ Requires a dev-client build (won't render in Expo Go — the import
 * itself is fine thanks to Metro, but `useCameraDevice` returns undefined
 * until the native module is linked).
 */
export default function PoseCameraView({ onError, facing = 'back' }: Props) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(facing);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission().catch((e) => onError?.(e?.message ?? 'permission error'));
    }
  }, [hasPermission, requestPermission, onError]);

  const detector = useMemo(() => loadPoseDetector(), []);

  // Bridge from worklet thread → JS thread, so we can call into the engine.
  const pushFrameJS = useMemo(
    () =>
      Worklets.createRunOnJS((frame: unknown, ts: number) => {
        const engine = getRealEngine();
        if (frame) engine.pushPoseFrame(frame as any, ts);
      }),
    [],
  );

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (!detector) return;
      try {
        const pose = detector.detect(frame);
        if (pose) pushFrameJS(pose, Date.now());
      } catch {
        // swallow — detection errors should not crash the camera
      }
    },
    [detector, pushFrameJS],
  );

  if (!device) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          No camera available. Build a dev-client (see DETECTION_SETUP.md) to
          use on-device pose detection.
        </Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Requesting camera permission…</Text>
      </View>
    );
  }

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive
      frameProcessor={detector ? frameProcessor : undefined}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#000',
  },
  placeholderText: { color: '#e5e7eb', textAlign: 'center' },
});
