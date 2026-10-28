// Real detection engine.
//
// Architecture note: a VisionCamera frame processor MUST run inside the
// React tree (a mounted <Camera /> component) — it can't be driven by a
// plain module. So this engine does NOT start a camera itself. Instead:
//
//   1. UI mounts `<PoseCameraView>` while detection is active.
//   2. For each camera frame, PoseCameraView calls `pushPoseFrame(pose)`
//      on this engine.
//   3. The engine feeds samples into the rep-counter FSM and emits
//      DetectionEvents to subscribers (the `useExerciseDetection` hook).
//
// This keeps the public DetectionEngine interface stable (start/stop/
// subscribe) while allowing the camera lifecycle to live in the UI.

import type { DetectionEngine, DetectionEvent } from './types';
import {
  EXERCISE_CONFIGS,
  angleBetween,
  createRepCounter,
  type RepCounter,
} from './repCounter';
import type { PoseFrame } from './pose/types';
import { isPoseDetectorAvailable } from './pose/poseDetectorLoader';
import { evaluatePosture } from './posture';

export interface PoseDebugInfo {
  framesReceived: number;   // raw detector callbacks
  framesWithPerson: number; // frames yielding a mapped pose
  personDetected: boolean;  // latest frame had enough joints
  leftKneeDeg: number | null;
  rightKneeDeg: number | null;
  minJointConfidence: number | null;
  phase: string;            // rep FSM phase (up/down/unknown)
  lastReject: string | null;
}

interface RealEngineHandle extends DetectionEngine {
  /**
   * Called by PoseCameraView on every processed frame.
   * Safe to call when the engine is stopped — it's a no-op in that case.
   */
  pushPoseFrame(pose: PoseFrame, timestampMs?: number): void;
  /** Called on every raw detector callback (even empty results). */
  noteRawFrame(): void;
  /** Called when a callback produced no usable person. */
  noteNoPerson(): void;
  /** Live diagnostics snapshot for the debug overlay. */
  getDebug(): PoseDebugInfo;

  /** Current exercise the engine is configured for (null when stopped). */
  getActiveExerciseType(): string | null;
}

const finite = (n: number): number | null => (Number.isFinite(n) ? Math.round(n) : null);

let instance: RealEngineHandle | null = null;

/**
 * Singleton accessor for the real engine. Used both by `detectionService`
 * (for the public interface) and by `PoseCameraView` (to push frames).
 */
export function getRealEngine(): RealEngineHandle {
  if (instance) return instance;

  const listeners = new Set<(e: DetectionEvent) => void>();
  let counter: RepCounter | null = null;
  let activeExercise: string | null = null;
  let running = false;
  const debug: PoseDebugInfo = { framesReceived: 0, framesWithPerson: 0, personDetected: false, leftKneeDeg: null, rightKneeDeg: null, minJointConfidence: null, phase: 'idle', lastReject: null };

  function emit(e: DetectionEvent) {
    listeners.forEach((l) => l(e));
  }

  instance = {
    isReal() { return isPoseDetectorAvailable(); },

    async init() {
      if (!isPoseDetectorAvailable()) throw new Error('Pose detection requires the native app build.');
    },

    async start(exerciseType: string) {
      const cfg = EXERCISE_CONFIGS[exerciseType];
      if (!cfg) {
        throw new Error(`No rep-counter config for exercise "${exerciseType}"`);
      }
      counter = createRepCounter(cfg);
      activeExercise = exerciseType;
      running = true;
    },

    async stop() {
      running = false;
      counter = null;
      activeExercise = null;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getActiveExerciseType() {
      return activeExercise;
    },

    noteRawFrame() {
      debug.framesReceived += 1;
      debug.personDetected = false;
    },

    noteNoPerson() {
      debug.lastReject = 'no person in frame';
    },

    getDebug() {
      return { ...debug, phase: counter ? counter.phase : (running ? 'waiting' : 'idle') };
    },

    pushPoseFrame(pose, timestampMs = Date.now()) {
      if (!running || !counter || !activeExercise) return;
      const cfg = EXERCISE_CONFIGS[activeExercise];
      if (!cfg) return;

      debug.framesWithPerson += 1;
      debug.personDetected = true;
      debug.leftKneeDeg = finite(angleBetween(pose, ['leftHip', 'leftKnee', 'leftAnkle'], 0).angleDeg);
      debug.rightKneeDeg = finite(angleBetween(pose, ['rightHip', 'rightKnee', 'rightAnkle'], 0).angleDeg);

      // Emit live posture/form feedback for the overlay.
      emit({
        type: 'posture',
        exerciseType: activeExercise,
        assessment: evaluatePosture(pose, activeExercise),
        timestamp: new Date(timestampMs).toISOString(),
      });

      const { angleDeg, visibility } = angleBetween(
        pose,
        cfg.angleJoints,
        cfg.minVisibility,
      );
      if (!Number.isFinite(angleDeg)) {
        debug.minJointConfidence = visibility;
        debug.lastReject = `low joint confidence (${visibility.toFixed(2)}) or missing landmarks`;
        return;
      }
      debug.minJointConfidence = visibility;
      debug.lastReject = null;

      const event = counter.push({ angleDeg, visibility, timestampMs });
      if (event) {
        emit({
          type: 'rep',
          exerciseType: activeExercise,
          totalReps: event.count,
          confidence: event.confidence,
          timestamp: new Date(timestampMs).toISOString(),
        });
      }
    },
  };

  return instance;
}

// Public factory used by `detectionService` — returns the singleton.
export function createRealDetectionEngine(): DetectionEngine {
  return getRealEngine();
}

/**
 * True when all native pieces (VisionCamera + a pose backend) are present.
 * Unsupported builds report unavailable; detection never falls back to simulation.
 */
export function isRealDetectionAvailable(): boolean {
  if (!isPoseDetectorAvailable()) return false;
  try {
    // VisionCamera must be resolvable — if not, we can't process frames.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('react-native-vision-camera');
    return true;
  } catch {
    return false;
  }
}
