// Transparent energy-expenditure estimates.
//
// BMR/RMR: energy the body uses for essential functions at rest, via the
// Mifflin–St Jeor equation. TDEE: BMR scaled by a broad activity level —
// it already includes everyday movement, so wearable active calories and
// logged workouts are context, NOT extra spend to add on top (prevents
// double-counting).

import type { Profile, Goal } from '../storage/profile';

const ACTIVITY_FACTOR: Record<string, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

/** Estimated resting expenditure (kcal/day). Null if profile incomplete. */
export function estimateBMR(p: Pick<Profile, 'sex' | 'age' | 'heightCm' | 'weightKg'> | null): number | null {
  if (!p || !p.weightKg || !p.heightCm || !p.age) return null;
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(p.sex === 'female' ? base - 161 : base + 5);
}

/** Estimated total daily expenditure. Includes routine movement — do not add workouts on top. */
export function estimateTDEE(p: Profile | null): number | null {
  const bmr = estimateBMR(p);
  return bmr == null ? null : Math.round(bmr * (ACTIVITY_FACTOR[p!.activityLevel] ?? 1.2));
}

/** Personalized calorie target for the goal. Conservative, bounded adjustments. */
export function calorieTarget(p: Profile | null): { low: number; high: number } | null {
  const tdee = estimateTDEE(p);
  if (tdee == null) return null;
  const goal: Goal = p!.goal;
  if (goal === 'weight_loss' || goal === 'body_recomposition') {
    // Modest deficit (~15%); never below a reasonable floor relative to BMR.
    const bmr = estimateBMR(p)!;
    return { low: Math.max(bmr, Math.round(tdee * 0.8)), high: Math.max(bmr, Math.round(tdee * 0.92)) };
  }
  if (goal === 'muscle_gain') return { low: Math.round(tdee * 1.05), high: Math.round(tdee * 1.15) };
  if (goal === 'weight_gain') return { low: Math.round(tdee * 1.1), high: Math.round(tdee * 1.2) };
  return { low: Math.round(tdee * 0.9), high: Math.round(tdee * 1.1) };
}

/** Estimated energy balance: logged intake minus expenditure estimate. */
export function energyBalance(loggedKcal: number | null, tdee: number | null) {
  if (loggedKcal == null || tdee == null) return null;
  return Math.round(loggedKcal - tdee);
}

/** Protein target (g) — higher for muscle goals. */
export function proteinTargetG(p: Profile | null): number | null {
  if (!p?.weightKg) return null;
  const perKg = p.goal === 'muscle_gain' || p.goal === 'body_recomposition' ? 1.8 : p.goal === 'weight_loss' ? 1.6 : 1.0;
  return Math.round(p.weightKg * perKg);
}
