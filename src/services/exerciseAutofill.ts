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
  if (!Number.isInteger(reps) || reps <= 0 || reps > 1000) return 'Reps must be a whole number from 1 to 1000';
  if (!Number.isFinite(weight) || weight < 0 || weight > 2000) return 'Weight must be between 0 and 2000 lb';
  return null;
}

export type WeightUnit = 'kg' | 'lb';
export const toPounds = (value: number, unit: WeightUnit) => unit === 'kg' ? value / 0.45359237 : value;
export const displayWeight = (pounds: number, unit: WeightUnit) => Math.round((unit === 'kg' ? pounds * 0.45359237 : pounds) * 100) / 100;
export const exerciseName = (name: string) => name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
export const elapsed = (start: string, end = Date.now()) => Math.max(0, Math.floor((end - Date.parse(start)) / 1000));
export const clockText = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
