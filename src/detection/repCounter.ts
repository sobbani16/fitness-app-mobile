// Pure rep-counter finite state machine.
//
// Input: a stream of { angleDeg, visibility, timestampMs } samples for the
// joint that characterises the exercise.
// Output: a RepEvent whenever a full rep completes (UP → DOWN → UP cycle).
//
// Design goals:
//   * Zero I/O, no React, no native deps → trivially unit-testable.
//   * Low false-positive rate via hysteresis + debounce + visibility gate.
//   * Per-exercise config so the same FSM handles squat / bench / row.

import type { KeypointName, PoseFrame } from './pose/types';

export type RepPhase = 'unknown' | 'up' | 'down';

export interface RepSample {
  angleDeg: number;
  visibility: number;
  timestampMs: number;
}

export interface RepEvent {
  count: number;
  rangeOfMotion: number;   // max - min angle observed across the rep
  durationMs: number;      // time from rep start to completion
  confidence: number;      // 0..1
}

export interface ExerciseConfig {
  /** Joint triplet forming the angle to track: [a, b (vertex), c]. */
  angleJoints: [KeypointName, KeypointName, KeypointName];
  /** Angle (deg) at or below which the rep is considered "down". */
  downBelow: number;
  /** Angle (deg) at or above which the rep is considered "up". */
  upAbove: number;
  /** Ignore samples below this keypoint visibility. */
  minVisibility: number;
  /** Minimum ms between successive rep completions to debounce noise. */
  minRepDurationMs: number;
}

export const EXERCISE_CONFIGS: Record<string, ExerciseConfig> = {
  'bench-press': {
    angleJoints: ['rightShoulder', 'rightElbow', 'rightWrist'],
    downBelow: 85,
    upAbove: 155,
    minVisibility: 0.5,
    minRepDurationMs: 500,
  },
  'push-up': {
    angleJoints: ['rightShoulder', 'rightElbow', 'rightWrist'],
    downBelow: 95,
    upAbove: 155,
    minVisibility: 0.5,
    minRepDurationMs: 500,
  },
  'overhead-press': {
    angleJoints: ['rightShoulder', 'rightElbow', 'rightWrist'],
    downBelow: 95,
    upAbove: 160,
    minVisibility: 0.5,
    minRepDurationMs: 600,
  },
  'squat': {
    angleJoints: ['rightHip', 'rightKnee', 'rightAnkle'],
    downBelow: 100,
    upAbove: 160,
    minVisibility: 0.5,
    minRepDurationMs: 700,
  },
  'deadlift': {
    angleJoints: ['rightShoulder', 'rightHip', 'rightKnee'],
    downBelow: 110,
    upAbove: 165,
    minVisibility: 0.5,
    minRepDurationMs: 700,
  },
  'barbell-row': {
    angleJoints: ['rightShoulder', 'rightElbow', 'rightWrist'],
    downBelow: 150,   // arms extended
    upAbove: 95,      // elbow flexed — we invert direction below
    minVisibility: 0.5,
    minRepDurationMs: 500,
  },
  'pull-up': {
    angleJoints: ['rightShoulder', 'rightElbow', 'rightWrist'],
    downBelow: 150,
    upAbove: 80,
    minVisibility: 0.5,
    minRepDurationMs: 600,
  },
};

export interface RepCounter {
  phase: RepPhase;
  count: number;
  push: (sample: RepSample) => RepEvent | null;
  reset: () => void;
}

/**
 * Factory for a rep counter tied to a specific exercise config.
 * The counter is stateful but pure — no imports of React / RN / globals.
 */
export function createRepCounter(cfg: ExerciseConfig): RepCounter {
  // For exercises where "down" is a larger angle than "up" (pull-up, row)
  // we flip the semantics: `down` = extended phase, `up` = flexed phase.
  const inverted = cfg.downBelow > cfg.upAbove;
  const downThreshold = inverted ? cfg.downBelow : cfg.downBelow;
  const upThreshold = inverted ? cfg.upAbove : cfg.upAbove;

  const isDown = (angle: number) =>
    inverted ? angle >= downThreshold : angle <= downThreshold;
  const isUp = (angle: number) =>
    inverted ? angle <= upThreshold : angle >= upThreshold;

  let phase: RepPhase = 'unknown';
  let count = 0;
  let repStartMs: number | null = null;
  let minAngle = Infinity;
  let maxAngle = -Infinity;
  let confidenceSum = 0;
  let samplesThisRep = 0;
  let lastRepAtMs = -Infinity;

  function resetRepStats() {
    repStartMs = null;
    minAngle = Infinity;
    maxAngle = -Infinity;
    confidenceSum = 0;
    samplesThisRep = 0;
  }

  const counter: RepCounter = {
    get phase() { return phase; },
    get count() { return count; },

    push(sample) {
      if (!Number.isFinite(sample.angleDeg)) return null;
      if (sample.visibility < cfg.minVisibility) return null;

      if (phase !== 'unknown') {
        if (sample.angleDeg < minAngle) minAngle = sample.angleDeg;
        if (sample.angleDeg > maxAngle) maxAngle = sample.angleDeg;
        confidenceSum += sample.visibility;
        samplesThisRep += 1;
      }

      // UP → DOWN: rep begins.
      if ((phase === 'up' || phase === 'unknown') && isDown(sample.angleDeg)) {
        phase = 'down';
        repStartMs = sample.timestampMs;
        minAngle = sample.angleDeg;
        maxAngle = sample.angleDeg;
        confidenceSum = sample.visibility;
        samplesThisRep = 1;
        return null;
      }

      // DOWN → UP: rep completes.
      if (phase === 'down' && isUp(sample.angleDeg)) {
        const now = sample.timestampMs;
        const durationMs = repStartMs !== null ? now - repStartMs : 0;
        const sinceLast = now - lastRepAtMs;

        // Debounce: ignore if happened too close to the previous rep.
        if (durationMs < cfg.minRepDurationMs || sinceLast < cfg.minRepDurationMs) {
          phase = 'up';
          resetRepStats();
          return null;
        }

        count += 1;
        lastRepAtMs = now;

        const rom = Number.isFinite(maxAngle - minAngle) ? maxAngle - minAngle : 0;
        const confidence = samplesThisRep > 0
          ? Math.min(1, confidenceSum / samplesThisRep)
          : 0;

        phase = 'up';
        resetRepStats();

        return { count, rangeOfMotion: rom, durationMs, confidence };
      }

      return null;
    },

    reset() {
      phase = 'unknown';
      count = 0;
      lastRepAtMs = -Infinity;
      resetRepStats();
    },
  };

  return counter;
}

/**
 * Compute the joint angle at vertex `b` formed by segments a-b and c-b.
 * Returns NaN if any required keypoint is missing/invisible enough.
 */
export function angleBetween(
  pose: PoseFrame,
  joints: [KeypointName, KeypointName, KeypointName],
  minVisibility = 0.3,
): { angleDeg: number; visibility: number } {
  const [aName, bName, cName] = joints;
  const a = pose[aName], b = pose[bName], c = pose[cName];
  if (!a || !b || !c) return { angleDeg: NaN, visibility: 0 };

  const visibility = Math.min(a.confidence, b.confidence, c.confidence);
  if (visibility < minVisibility) return { angleDeg: NaN, visibility };

  const v1x = a.x - b.x, v1y = a.y - b.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const m1 = Math.hypot(v1x, v1y);
  const m2 = Math.hypot(v2x, v2y);
  if (m1 === 0 || m2 === 0) return { angleDeg: NaN, visibility };
  const cos = Math.max(-1, Math.min(1, dot / (m1 * m2)));
  const angleDeg = (Math.acos(cos) * 180) / Math.PI;
  return { angleDeg, visibility };
}
