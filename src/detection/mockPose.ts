// Synthetic posture assessments for the mock engine.
//
// Real on-device pose isn't available in Expo Go, so we animate a plausible
// side-view skeleton from a "bad form" keyframe to a "good form" keyframe.
// Flagged joints render red with correction arrows, then turn green once the
// (simulated) athlete reaches good form — demonstrating the full UX.

import type { KeypointName } from './pose/types';
import type {
  Direction,
  PostureAssessment,
  PostureCorrection,
  PostureKeypoint,
} from './posture';

type XY = { x: number; y: number };
// Right-side joints we author; left side is mirrored from these.
type SideCoords = {
  nose: XY;
  shoulder: XY;
  elbow: XY;
  wrist: XY;
  hip: XY;
  knee: XY;
  ankle: XY;
};

interface MockExercise {
  bad: SideCoords;
  good: SideCoords;
  /** Joints that are "off" in the bad keyframe. */
  flagged: KeypointName[];
  /** Arrows shown while form is still off. */
  arrows: PostureCorrection[];
  /** Coaching cue shown while form is off. */
  cue: string;
}

const c = (x: number, y: number): XY => ({ x, y });

const MOCK: Record<string, MockExercise> = {
  squat: {
    bad: {
      nose: c(0.60, 0.30), shoulder: c(0.52, 0.42), elbow: c(0.60, 0.46),
      wrist: c(0.68, 0.47), hip: c(0.47, 0.55), knee: c(0.55, 0.62),
      ankle: c(0.53, 0.86),
    },
    good: {
      nose: c(0.52, 0.26), shoulder: c(0.50, 0.40), elbow: c(0.59, 0.45),
      wrist: c(0.67, 0.46), hip: c(0.45, 0.60), knee: c(0.58, 0.63),
      ankle: c(0.53, 0.86),
    },
    flagged: ['rightShoulder', 'rightHip', 'rightKnee'],
    arrows: [
      { joint: 'rightShoulder', direction: 'up' },
      { joint: 'rightHip', direction: 'down' },
    ],
    cue: 'Chest up and sit deeper',
  },
  'push-up': {
    bad: {
      nose: c(0.30, 0.50), shoulder: c(0.40, 0.50), elbow: c(0.46, 0.42),
      wrist: c(0.50, 0.55), hip: c(0.60, 0.58), knee: c(0.78, 0.62),
      ankle: c(0.92, 0.64),
    },
    good: {
      nose: c(0.28, 0.46), shoulder: c(0.40, 0.46), elbow: c(0.47, 0.55),
      wrist: c(0.50, 0.62), hip: c(0.62, 0.48), knee: c(0.78, 0.50),
      ankle: c(0.92, 0.52),
    },
    flagged: ['rightHip', 'rightElbow'],
    arrows: [
      { joint: 'rightHip', direction: 'up' },
      { joint: 'rightElbow', direction: 'down' },
    ],
    cue: "Straighten your body — don't sag",
  },
  'bench-press': {
    bad: {
      nose: c(0.30, 0.40), shoulder: c(0.40, 0.45), elbow: c(0.45, 0.30),
      wrist: c(0.52, 0.22), hip: c(0.62, 0.50), knee: c(0.78, 0.55),
      ankle: c(0.90, 0.78),
    },
    good: {
      nose: c(0.30, 0.40), shoulder: c(0.40, 0.45), elbow: c(0.44, 0.32),
      wrist: c(0.45, 0.46), hip: c(0.62, 0.50), knee: c(0.78, 0.55),
      ankle: c(0.90, 0.78),
    },
    flagged: ['rightElbow', 'rightWrist'],
    arrows: [{ joint: 'rightElbow', direction: 'down' }],
    cue: 'Control the bar to ~90° at the elbow',
  },
  'overhead-press': {
    bad: {
      nose: c(0.52, 0.22), shoulder: c(0.50, 0.34), elbow: c(0.56, 0.26),
      wrist: c(0.58, 0.34), hip: c(0.50, 0.62), knee: c(0.50, 0.80),
      ankle: c(0.50, 0.95),
    },
    good: {
      nose: c(0.52, 0.22), shoulder: c(0.50, 0.34), elbow: c(0.52, 0.22),
      wrist: c(0.52, 0.10), hip: c(0.50, 0.62), knee: c(0.50, 0.80),
      ankle: c(0.50, 0.95),
    },
    flagged: ['rightElbow', 'rightWrist'],
    arrows: [{ joint: 'rightWrist', direction: 'up' }],
    cue: 'Press to full lockout overhead',
  },
  deadlift: {
    bad: {
      nose: c(0.62, 0.34), shoulder: c(0.52, 0.44), elbow: c(0.52, 0.56),
      wrist: c(0.52, 0.66), hip: c(0.44, 0.56), knee: c(0.55, 0.70),
      ankle: c(0.53, 0.92),
    },
    good: {
      nose: c(0.54, 0.20), shoulder: c(0.50, 0.34), elbow: c(0.50, 0.48),
      wrist: c(0.50, 0.60), hip: c(0.48, 0.58), knee: c(0.52, 0.74),
      ankle: c(0.52, 0.92),
    },
    flagged: ['rightShoulder', 'rightHip'],
    arrows: [{ joint: 'rightShoulder', direction: 'up' }],
    cue: 'Neutral spine — chest up',
  },
  'barbell-row': {
    bad: {
      nose: c(0.64, 0.40), shoulder: c(0.54, 0.46), elbow: c(0.52, 0.60),
      wrist: c(0.52, 0.70), hip: c(0.42, 0.50), knee: c(0.50, 0.72),
      ankle: c(0.50, 0.92),
    },
    good: {
      nose: c(0.64, 0.40), shoulder: c(0.54, 0.46), elbow: c(0.58, 0.52),
      wrist: c(0.56, 0.40), hip: c(0.42, 0.50), knee: c(0.50, 0.72),
      ankle: c(0.50, 0.92),
    },
    flagged: ['rightElbow'],
    arrows: [{ joint: 'rightElbow', direction: 'up' }],
    cue: 'Pull the elbow back fully',
  },
  'pull-up': {
    bad: {
      nose: c(0.52, 0.32), shoulder: c(0.50, 0.42), elbow: c(0.52, 0.30),
      wrist: c(0.52, 0.16), hip: c(0.50, 0.66), knee: c(0.50, 0.82),
      ankle: c(0.50, 0.96),
    },
    good: {
      nose: c(0.52, 0.22), shoulder: c(0.50, 0.30), elbow: c(0.54, 0.22),
      wrist: c(0.52, 0.14), hip: c(0.50, 0.56), knee: c(0.50, 0.74),
      ankle: c(0.50, 0.90),
    },
    flagged: ['rightElbow', 'rightShoulder'],
    arrows: [{ joint: 'rightShoulder', direction: 'up' }],
    cue: 'Pull until your chin clears the bar',
  },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpXY = (a: XY, b: XY, t: number): XY => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
});

// Form is considered corrected past this point in the animation.
const GOOD_THRESHOLD = 0.82;

export function mockExerciseSupported(exerciseType: string): boolean {
  return Boolean(MOCK[exerciseType]);
}

/**
 * Build a synthetic posture assessment at progress `t` in [0,1] (0 = bad
 * form, 1 = good form) for the given exercise.
 */
export function mockPostureAssessment(
  exerciseType: string,
  t: number,
): PostureAssessment {
  const def = MOCK[exerciseType] ?? MOCK.squat;
  const clamped = Math.max(0, Math.min(1, t));
  const corrected = clamped >= GOOD_THRESHOLD;

  const side: SideCoords = {
    nose: lerpXY(def.bad.nose, def.good.nose, clamped),
    shoulder: lerpXY(def.bad.shoulder, def.good.shoulder, clamped),
    elbow: lerpXY(def.bad.elbow, def.good.elbow, clamped),
    wrist: lerpXY(def.bad.wrist, def.good.wrist, clamped),
    hip: lerpXY(def.bad.hip, def.good.hip, clamped),
    knee: lerpXY(def.bad.knee, def.good.knee, clamped),
    ankle: lerpXY(def.bad.ankle, def.good.ankle, clamped),
  };

  const flagged = new Set(def.flagged);
  const okFor = (name: KeypointName) => corrected || !flagged.has(name);

  // Mirror the right side to a slightly-offset left side so the torso and
  // limb bones render as a fuller skeleton.
  const dx = 0.03;
  const kp = (name: KeypointName, p: XY, conf = 0.95): PostureKeypoint => ({
    name,
    x: p.x,
    y: p.y,
    ok: okFor(name),
    confidence: conf,
  });

  const keypoints: PostureKeypoint[] = [
    kp('nose', side.nose),
    kp('rightShoulder', side.shoulder),
    kp('leftShoulder', { x: side.shoulder.x - dx, y: side.shoulder.y }, 0.7),
    kp('rightElbow', side.elbow),
    kp('leftElbow', { x: side.elbow.x - dx, y: side.elbow.y }, 0.7),
    kp('rightWrist', side.wrist),
    kp('leftWrist', { x: side.wrist.x - dx, y: side.wrist.y }, 0.7),
    kp('rightHip', side.hip),
    kp('leftHip', { x: side.hip.x - dx, y: side.hip.y }, 0.7),
    kp('rightKnee', side.knee),
    kp('leftKnee', { x: side.knee.x - dx, y: side.knee.y }, 0.7),
    kp('rightAnkle', side.ankle),
    kp('leftAnkle', { x: side.ankle.x - dx, y: side.ankle.y }, 0.7),
  ];

  const corrections: PostureCorrection[] = corrected ? [] : def.arrows;
  const score = corrected ? 1 : Math.min(0.95, 0.4 + clamped * 0.5);

  return {
    exerciseType,
    keypoints,
    corrections,
    overallOk: corrected,
    score,
    message: corrected ? 'Good form — keep it up!' : def.cue,
  };
}
