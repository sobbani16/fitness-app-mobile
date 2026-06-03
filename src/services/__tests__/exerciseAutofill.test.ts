import {
  nextSetWeight,
  adjustWeight,
  validateSet,
} from '../exerciseAutofill';
import type { ExerciseSet, ExercisePrefill } from '../../types/exercise';

const set = (reps: number, weight: number): ExerciseSet => ({
  reps,
  weight,
  timestamp: '2026-04-23T00:00:00.000Z',
});

describe('nextSetWeight', () => {
  it('returns null when there is no history and no current sets', () => {
    expect(nextSetWeight([], null)).toBeNull();
  });

  it('falls back to historical suggestedWeight when no current sets', () => {
    const prefill: ExercisePrefill = {
      suggestedWeight: 40,
      lastSessionAt: '2026-04-20T00:00:00.000Z',
      lastSetCount: 3,
    };
    expect(nextSetWeight([], prefill)).toBe(40);
  });

  it('reuses the weight from the most recent set in the current session', () => {
    expect(nextSetWeight([set(10, 40), set(8, 45)], null)).toBe(45);
  });

  it('current-session weight wins over historical suggestedWeight', () => {
    const prefill: ExercisePrefill = {
      suggestedWeight: 40,
      lastSessionAt: '2026-04-20T00:00:00.000Z',
      lastSetCount: 3,
    };
    expect(nextSetWeight([set(8, 50)], prefill)).toBe(50);
  });

  it('override takes priority (including 0 for bodyweight)', () => {
    expect(nextSetWeight([set(8, 50)], null, 70)).toBe(70);
    expect(nextSetWeight([set(8, 50)], null, 0)).toBe(0);
  });

  it('ignores non-finite override', () => {
    // @ts-expect-error testing runtime guard
    expect(nextSetWeight([set(8, 50)], null, 'abc')).toBe(50);
  });
});

describe('adjustWeight', () => {
  it('adds the delta', () => {
    expect(adjustWeight(40, 2.5)).toBe(42.5);
  });

  it('clamps at zero', () => {
    expect(adjustWeight(1, -5)).toBe(0);
  });

  it('treats null as zero base', () => {
    expect(adjustWeight(null, 5)).toBe(5);
  });

  it('rounds to 2 decimals', () => {
    expect(adjustWeight(10, 0.1)).toBe(10.1);
  });
});

describe('validateSet', () => {
  it('rejects non-positive reps', () => {
    expect(validateSet(0, 50)).toMatch(/reps/i);
    expect(validateSet(-1, 50)).toMatch(/reps/i);
  });

  it('rejects negative weight', () => {
    expect(validateSet(10, -5)).toMatch(/weight/i);
  });

  it('accepts bodyweight (0) and positive reps', () => {
    expect(validateSet(10, 0)).toBeNull();
  });

  it('accepts normal inputs', () => {
    expect(validateSet(8, 42.5)).toBeNull();
  });
});
