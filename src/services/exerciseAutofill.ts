// Pure autofill logic for smart exercise logging.
// No React / network deps — trivially unit-testable.

import type { ExerciseSet, ExercisePrefill } from '../types/exercise';

/**
 * Derive the weight to prefill for the next set in the current in-progress session.
 *
 * Priority (highest first):
 *  1. explicit user override (finite number, including 0 for bodyweight)
 *  2. weight of the most recent set in the current session
 *  3. suggestedWeight from historical prefill data
 *  4. null → UI shows empty field
 */
export function nextSetWeight(
  currentSets: ExerciseSet[],
  prefill: ExercisePrefill | null,
  override?: number | null,
): number | null {
  if (override !== undefined && override !== null && Number.isFinite(Number(override))) {
    return Number(override);
  }
  if (currentSets.length > 0) {
    const last = currentSets[currentSets.length - 1];
    if (Number.isFinite(last.weight)) return last.weight;
  }
  if (prefill && prefill.suggestedWeight !== null && Number.isFinite(prefill.suggestedWeight)) {
    return prefill.suggestedWeight;
  }
  return null;
}

/**
 * Apply a +/- increment to a weight value, clamping at 0.
 * Uses a default step of 2.5 (kg/lb — unit-agnostic).
 */
export function adjustWeight(current: number | null, delta: number): number {
  const base = Number.isFinite(current as number) ? (current as number) : 0;
  const next = base + delta;
  return next < 0 ? 0 : roundTo(next, 2);
}

function roundTo(n: number, decimals: number): number {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
}

/**
 * Validate a candidate set before adding to a session.
 * Returns an error string, or null if the set is valid.
 */
export function validateSet(reps: number, weight: number): string | null {
  if (!Number.isFinite(reps) || reps <= 0) return 'Reps must be greater than 0';
  if (!Number.isFinite(weight) || weight < 0) return 'Weight must be 0 or greater';
  return null;
}
