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

interface RealEngineHandle extends DetectionEngine {
  /**
   * Called by PoseCameraView on every processed frame.
   * Safe to call when the engine is stopped — it's a no-op in that case.
   */
  pushPoseFrame(pose: PoseFrame, timestampMs?: number): void;

  /** Current exercise the engine is configured for (null when stopped). */
  getActiveExerciseType(): string | null;
}

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

  function emit(e: DetectionEvent) {
    listeners.forEach((l) => l(e));
  }

  instance = {
    isReal() { return isPoseDetectorAvailable(); },

    async init() {
      // Model loads inside PoseCameraView when it mounts.
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

    pushPoseFrame(pose, timestampMs = Date.now()) {
      if (!running || !counter || !activeExercise) return;
      const cfg = EXERCISE_CONFIGS[activeExercise];
      if (!cfg) return;

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
      if (!Number.isFinite(angleDeg)) return;

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
 * Drives whether `detectionService` picks the real vs mock engine.
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
