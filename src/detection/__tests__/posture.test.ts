import { evaluatePosture, POSTURE_RULES } from '../posture';
import { mockPostureAssessment, mockExerciseSupported } from '../mockPose';
import type { PoseFrame } from '../pose/types';

describe('mockPostureAssessment', () => {
  it('reports bad form with corrections at t=0', () => {
    const a = mockPostureAssessment('squat', 0);
    expect(a.overallOk).toBe(false);
    expect(a.corrections.length).toBeGreaterThan(0);
    expect(a.keypoints.some((k) => !k.ok)).toBe(true);
    expect(a.message).not.toMatch(/good form/i);
  });

  it('reports good form with no corrections at t=1', () => {
    const a = mockPostureAssessment('squat', 1);
    expect(a.overallOk).toBe(true);
    expect(a.corrections).toHaveLength(0);
    expect(a.keypoints.every((k) => k.ok)).toBe(true);
    expect(a.message).toMatch(/good form/i);
  });

  it('supports every exercise that has posture rules', () => {
    Object.keys(POSTURE_RULES).forEach((ex) => {
      expect(mockExerciseSupported(ex)).toBe(true);
      const a = mockPostureAssessment(ex, 0);
      expect(a.exerciseType).toBe(ex);
      expect(a.keypoints.length).toBeGreaterThan(0);
    });
  });

  it('clamps progress and increases score as form improves', () => {
    const low = mockPostureAssessment('squat', -1).score;
    const high = mockPostureAssessment('squat', 0.5).score;
    expect(high).toBeGreaterThanOrEqual(low);
  });
});

describe('evaluatePosture', () => {
  it('passes a straight arm for an overhead-press lockout', () => {
    // Shoulder -> elbow -> wrist roughly in a vertical line (~180°).
    const pose: PoseFrame = {
      rightShoulder: { x: 0.5, y: 0.4, confidence: 0.9 },
      rightElbow: { x: 0.5, y: 0.25, confidence: 0.9 },
      rightWrist: { x: 0.5, y: 0.1, confidence: 0.9 },
    };
    const a = evaluatePosture(pose, 'overhead-press');
    expect(a.overallOk).toBe(true);
  });

  it('flags a bent arm for an overhead-press lockout', () => {
    // Elbow kicked out so the angle is far from 180°.
    const pose: PoseFrame = {
      rightShoulder: { x: 0.5, y: 0.4, confidence: 0.9 },
      rightElbow: { x: 0.65, y: 0.3, confidence: 0.9 },
      rightWrist: { x: 0.5, y: 0.22, confidence: 0.9 },
    };
    const a = evaluatePosture(pose, 'overhead-press');
    expect(a.overallOk).toBe(false);
    expect(a.corrections.length).toBeGreaterThan(0);
  });

  it('returns ok with no rules for an unknown exercise', () => {
    const a = evaluatePosture({}, 'unknown-exercise');
    expect(a.overallOk).toBe(true);
    expect(a.corrections).toHaveLength(0);
  });
});
