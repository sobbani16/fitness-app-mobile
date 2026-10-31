// Pure helpers for the Quick Add fast-logging flows. No React / no I/O so the
// trust and validation rules stay unit-testable.

import { LoggedMeal } from '../storage/meals';
import { UnitSystem } from '../storage/profile';
import { lbToKg } from '../util/units';

export const QUICK_WATER_ML = 250;
export const MIN_WEIGHT_KG = 20;
export const MAX_WEIGHT_KG = 400;

/**
 * A saved meal may skip the review step only when its portion and nutrition
 * came from a verified source. AI estimates, manual entries, user-edited
 * nutrition, unweighed meals and estimated catalog profiles all re-open the
 * review flow instead of silently logging questionable values.
 */
export function isTrustedRepeatMeal(meal: LoggedMeal): boolean {
  if (!Number.isFinite(meal.quantityG) || (meal.quantityG ?? 0) <= 0) return false;
  if (!Number.isFinite(meal.calories) || meal.calories < 0) return false;
  const { protein_g, carbs_g, fat_g, fiber_g } = meal.macros ?? {};
  if (![protein_g, carbs_g, fat_g].every(v => Number.isFinite(v) && v >= 0)) return false;
  if (fiber_g != null && (!Number.isFinite(fiber_g) || fiber_g < 0)) return false;
  if (meal.source === 'Manual entry' || meal.source?.startsWith('AI')) return false;
  const snapshot = meal.nutritionSnapshot ?? {};
  if (snapshot.userEdited || snapshot.reviewRequired) return false;
  if (snapshot.verificationLevel !== 'SOURCE_BACKED_FULL') return false;
  return Boolean(meal.ingredientId) || meal.source?.startsWith('ingredient:') || meal.source?.startsWith('recipe:') || false;
}

/** Build the new diary entry for a confirmed repeat. Photos are never carried over. */
export function buildRepeatMeal(meal: LoggedMeal, now: Date = new Date()): LoggedMeal {
  return {
    ...meal,
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now.toISOString(),
    photoUri: undefined,
    feedback: `Repeated ${meal.name}`,
  };
}

export interface ParsedWeight {
  weightKg?: number;
  error?: string;
}

/** Parse a weight entry in the user's preferred units; canonical storage stays kg. */
export function parseWeightInput(text: string, units: UnitSystem): ParsedWeight {
  const raw = Number(text.trim().replace(',', '.'));
  if (!Number.isFinite(raw) || raw <= 0) return { error: 'Enter your weight as a number.' };
  const weightKg = units === 'imperial' ? lbToKg(raw) : raw;
  if (weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) {
    return { error: `Enter a weight between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg.` };
  }
  return { weightKg: Math.round(weightKg * 10) / 10 };
}

/** Favorites first, then recent unique foods, capped for the compact sheet. */
export function quickRepeatChoices(favorites: LoggedMeal[], recents: LoggedMeal[], limit = 3): LoggedMeal[] {
  const seen = new Set<string>();
  const out: LoggedMeal[] = [];
  for (const meal of [...favorites, ...recents]) {
    const key = meal.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(meal);
    if (out.length >= limit) break;
  }
  return out;
}
