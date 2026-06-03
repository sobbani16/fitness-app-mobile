// Pure functions for scaling calories & macros by portion grams.
// No React / no I/O — unit-testable in isolation.

import type { Macros } from '../storage/meals';

export function caloriesForPortion(
  caloriesPer100g: number,
  grams: number,
): number {
  if (!Number.isFinite(caloriesPer100g) || caloriesPer100g < 0) return 0;
  if (!Number.isFinite(grams) || grams <= 0) return 0;
  return Math.round((caloriesPer100g * grams) / 100);
}

export function macrosForPortion(
  macrosPer100g: Macros,
  grams: number,
): Macros {
  const scale = (v: number) => {
    if (!Number.isFinite(v) || v < 0) return 0;
    if (!Number.isFinite(grams) || grams <= 0) return 0;
    return Math.round(((v * grams) / 100) * 10) / 10; // 1 decimal
  };
  return {
    protein_g: scale(macrosPer100g.protein_g),
    carbs_g: scale(macrosPer100g.carbs_g),
    fat_g: scale(macrosPer100g.fat_g),
  };
}
