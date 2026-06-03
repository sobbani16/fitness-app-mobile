// Mock detection engine — simulates rep counting and weight estimation.
// Useful for Expo Go + tests + demoing UX before a real model lands.
//
// Behavior:
//  - Emits one "rep" event per `repIntervalMs` (default 2s) with rising count
//  - Emits a single "weight-estimate" shortly after start, based on a per-
//    exercise lookup table (typical starter loads)

import type { DetectionEngine, DetectionEvent } from './types';
import { mockPostureAssessment } from './mockPose';

const TYPICAL_WEIGHT_KG: Record<string, number> = {
  'bench-press': 40,
  'squat': 60,
  'deadlift': 80,
  'overhead-press': 30,
  'barbell-row': 45,
  'pull-up': 0,     // bodyweight
  'push-up': 0,
};

interface MockOptions {
  repIntervalMs?: number;
  initialWeightDelayMs?: number;
  /** How often to emit synthetic posture frames. */
  postureIntervalMs?: number;
  /** Seconds for one bad→good→reset posture cycle. */
  postureCycleMs?: number;
}

export function createMockDetectionEngine(opts: MockOptions = {}): DetectionEngine {
  const repIntervalMs = opts.repIntervalMs ?? 2000;
  const initialWeightDelayMs = opts.initialWeightDelayMs ?? 800;
  const postureIntervalMs = opts.postureIntervalMs ?? 120;
  const postureCycleMs = opts.postureCycleMs ?? 6000;

  const listeners = new Set<(e: DetectionEvent) => void>();
  let repTimer: ReturnType<typeof setInterval> | null = null;
  let weightTimer: ReturnType<typeof setTimeout> | null = null;
  let postureTimer: ReturnType<typeof setInterval> | null = null;
  let reps = 0;
  let currentExercise = '';

  function emit(e: DetectionEvent) {
    listeners.forEach((l) => l(e));
  }

  function stopInternal() {
    if (repTimer) { clearInterval(repTimer); repTimer = null; }
    if (weightTimer) { clearTimeout(weightTimer); weightTimer = null; }
    if (postureTimer) { clearInterval(postureTimer); postureTimer = null; }
  }

  // Maps elapsed time to posture progress t in [0,1]: ramps bad→good over the
  // first 60% of the cycle, holds good for the next 25%, then resets to bad.
  function postureProgress(elapsedMs: number): number {
    const phase = (elapsedMs % postureCycleMs) / postureCycleMs;
    if (phase < 0.6) return phase / 0.6;       // 0 → 1
    if (phase < 0.85) return 1;                // hold good
    return 0;                                  // reset to bad
  }

  return {
    isReal() { return false; },

    async init() {
      // No-op for the mock.
    },

    async start(exerciseType: string) {
      stopInternal();
      reps = 0;
      currentExercise = exerciseType;

      const kg = TYPICAL_WEIGHT_KG[exerciseType] ?? 20;
      weightTimer = setTimeout(() => {
        emit({
          type: 'weight-estimate',
          exerciseType,
          grams: Math.round(kg * 1000),
          confidence: 0.55,
          timestamp: new Date().toISOString(),
        });
      }, initialWeightDelayMs);

      repTimer = setInterval(() => {
        reps += 1;
        emit({
          type: 'rep',
          exerciseType: currentExercise,
          totalReps: reps,
          confidence: 0.75,
          timestamp: new Date().toISOString(),
        });
      }, repIntervalMs);

      const startedAt = Date.now();
      postureTimer = setInterval(() => {
        const t = postureProgress(Date.now() - startedAt);
        emit({
          type: 'posture',
          exerciseType: currentExercise,
          assessment: mockPostureAssessment(currentExercise, t),
          timestamp: new Date().toISOString(),
        });
      }, postureIntervalMs);
    },

    async stop() {
      stopInternal();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
