// Posture / form assessment.
//
// Produces a `PostureAssessment` describing, per keypoint, whether the joint
// is in an acceptable position for the current exercise, plus directional
// "move this way" corrections. The UI renders a skeleton overlay that turns
// red where form is off (with arrows) and green once corrected.
//
// Two producers feed the same assessment shape:
//   * Real engine  -> `evaluatePosture(pose, exercise)` (angle-rule based).
//   * Mock engine  -> synthetic assessments (see mockPose.ts) so the feature
//                     is demoable in Expo Go without a native pose model.

import { angleBetween } from './repCounter';
import type { KeypointName, PoseFrame } from './pose/types';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface PostureKeypoint {
  name: KeypointName;
  x: number; // normalized [0,1]
  y: number; // normalized [0,1]
  ok: boolean;
  confidence: number;
}

export interface PostureCorrection {
  joint: KeypointName;
  direction: Direction;
}

export interface PostureAssessment {
  exerciseType: string;
  keypoints: PostureKeypoint[];
  corrections: PostureCorrection[];
  overallOk: boolean;
  score: number; // 0..1 fraction of checks passed
  message: string;
}

export const ARROW_GLYPH: Record<Direction, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

// Bones to draw for the skeleton overlay.
export const SKELETON_EDGES: [KeypointName, KeypointName][] = [
  ['nose', 'rightShoulder'],
  ['nose', 'leftShoulder'],
  ['leftShoulder', 'rightShoulder'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightHip'],
  ['leftShoulder', 'leftHip'],
  ['leftHip', 'rightHip'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
];

interface PostureRule {
  id: string;
  label: string; // coaching cue shown when violated
  joints: [KeypointName, KeypointName, KeypointName];
  min: number;
  max: number;
  flag: KeypointName[];        // joints to color red when violated
  arrowJoint: KeypointName;    // where to draw the correction arrow
  whenLow: Direction;          // angle < min
  whenHigh: Direction;         // angle > max
  minVisibility?: number;
}

// Per-exercise form rules. Ranges are intentionally forgiving — the goal is
// actionable feedback, not biomechanical perfection.
export const POSTURE_RULES: Record<string, PostureRule[]> = {
  squat: [
    {
      id: 'depth',
      label: 'Sit deeper — aim for thighs near parallel',
      joints: ['rightHip', 'rightKnee', 'rightAnkle'],
      min: 70,
      max: 120,
      flag: ['rightKnee', 'rightHip'],
      arrowJoint: 'rightHip',
      whenLow: 'up',
      whenHigh: 'down',
    },
    {
      id: 'back',
      label: 'Chest up — keep your back straight',
      joints: ['rightShoulder', 'rightHip', 'rightKnee'],
      min: 40,
      max: 135,
      flag: ['rightShoulder'],
      arrowJoint: 'rightShoulder',
      whenLow: 'up',
      whenHigh: 'up',
    },
  ],
  'push-up': [
    {
      id: 'elbow',
      label: 'Lower until elbows reach ~90°',
      joints: ['rightShoulder', 'rightElbow', 'rightWrist'],
      min: 70,
      max: 110,
      flag: ['rightElbow'],
      arrowJoint: 'rightElbow',
      whenLow: 'up',
      whenHigh: 'down',
    },
    {
      id: 'body',
      label: "Keep a straight line — don't let hips sag",
      joints: ['rightShoulder', 'rightHip', 'rightKnee'],
      min: 150,
      max: 200,
      flag: ['rightHip'],
      arrowJoint: 'rightHip',
      whenLow: 'up',
      whenHigh: 'down',
    },
  ],
  'bench-press': [
    {
      id: 'elbow',
      label: 'Control the bar to ~90° at the elbow',
      joints: ['rightShoulder', 'rightElbow', 'rightWrist'],
      min: 70,
      max: 115,
      flag: ['rightElbow'],
      arrowJoint: 'rightElbow',
      whenLow: 'up',
      whenHigh: 'down',
    },
  ],
  'overhead-press': [
    {
      id: 'lockout',
      label: 'Press to full lockout overhead',
      joints: ['rightShoulder', 'rightElbow', 'rightWrist'],
      min: 150,
      max: 200,
      flag: ['rightElbow', 'rightWrist'],
      arrowJoint: 'rightWrist',
      whenLow: 'up',
      whenHigh: 'up',
    },
  ],
  deadlift: [
    {
      id: 'back',
      label: 'Neutral spine — chest up, hinge at the hips',
      joints: ['rightShoulder', 'rightHip', 'rightKnee'],
      min: 150,
      max: 210,
      flag: ['rightShoulder', 'rightHip'],
      arrowJoint: 'rightShoulder',
      whenLow: 'up',
      whenHigh: 'up',
    },
  ],
  'barbell-row': [
    {
      id: 'pull',
      label: 'Pull the elbow back fully',
      joints: ['rightShoulder', 'rightElbow', 'rightWrist'],
      min: 60,
      max: 110,
      flag: ['rightElbow'],
      arrowJoint: 'rightElbow',
      whenLow: 'down',
      whenHigh: 'up',
    },
    {
      id: 'torso',
      label: 'Hold your torso angle steady',
      joints: ['rightShoulder', 'rightHip', 'rightKnee'],
      min: 95,
      max: 160,
      flag: ['rightHip'],
      arrowJoint: 'rightShoulder',
      whenLow: 'up',
      whenHigh: 'down',
    },
  ],
  'pull-up': [
    {
      id: 'pull',
      label: 'Pull until your chin clears the bar',
      joints: ['rightShoulder', 'rightElbow', 'rightWrist'],
      min: 40,
      max: 95,
      flag: ['rightElbow'],
      arrowJoint: 'rightShoulder',
      whenLow: 'up',
      whenHigh: 'up',
    },
  ],
};

const ALL_KEYPOINTS: KeypointName[] = [
  'nose',
  'leftEye', 'rightEye',
  'leftEar', 'rightEar',
  'leftShoulder', 'rightShoulder',
  'leftElbow', 'rightElbow',
  'leftWrist', 'rightWrist',
  'leftHip', 'rightHip',
  'leftKnee', 'rightKnee',
  'leftAnkle', 'rightAnkle',
];

/**
 * Evaluate posture for a detected pose against the exercise's form rules.
 * Used by the real engine. Returns null only when there are no rules.
 */
export function evaluatePosture(
  pose: PoseFrame,
  exerciseType: string,
): PostureAssessment {
  const rules = POSTURE_RULES[exerciseType] ?? [];

  const badJoints = new Set<KeypointName>();
  const corrections: PostureCorrection[] = [];
  const messages: string[] = [];
  let passed = 0;
  let evaluated = 0;

  for (const rule of rules) {
    const { angleDeg, visibility } = angleBetween(
      pose,
      rule.joints,
      rule.minVisibility ?? 0.3,
    );
    if (!Number.isFinite(angleDeg)) continue;
    evaluated += 1;

    if (angleDeg < rule.min || angleDeg > rule.max) {
      rule.flag.forEach((j) => badJoints.add(j));
      corrections.push({
        joint: rule.arrowJoint,
        direction: angleDeg < rule.min ? rule.whenLow : rule.whenHigh,
      });
      messages.push(rule.label);
    } else {
      passed += 1;
    }
  }

  const keypoints: PostureKeypoint[] = [];
  for (const name of ALL_KEYPOINTS) {
    const kp = pose[name];
    if (!kp) continue;
    keypoints.push({
      name,
      x: kp.x,
      y: kp.y,
      ok: !badJoints.has(name),
      confidence: kp.confidence,
    });
  }

  const overallOk = corrections.length === 0;
  const score = evaluated > 0 ? passed / evaluated : 1;

  return {
    exerciseType,
    keypoints,
    corrections,
    overallOk,
    score,
    message: overallOk ? 'Good form — keep it up!' : messages[0],
  };
}
