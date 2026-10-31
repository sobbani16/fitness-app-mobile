import type { MenuItem } from '../api/labelScanner';

export function itemMacros(i: MenuItem, portionG: number) {
  if (i.estimate) {
    const midG = (i.estimate.calories.portionGMin + i.estimate.calories.portionGMax) / 2;
    const scale = midG > 0 ? portionG / midG : 1;
    const mid = (r: { min: number; max: number }) => Math.round(((r.min + r.max) / 2) * scale * 10) / 10;
    return { calories: Math.round(mid(i.estimate.calories)), protein_g: mid(i.estimate.proteinG), carbs_g: mid(i.estimate.carbsG), fat_g: mid(i.estimate.fatG) };
  }
  return { calories: i.calories ?? 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
}

