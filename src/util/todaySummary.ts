import { LoggedMeal } from '../storage/meals';
export function sameLocalDay(value: string, now: Date) {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}
export function sumKnown(values: (number | undefined | null)[]): number | null {
  if (values.some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) return null;
  return values.reduce<number>((sum, value) => sum + (value as number), 0);
}
export function todaySummary(meals: LoggedMeal[], now = new Date()) {
  const today = meals.filter(meal => sameLocalDay(meal.createdAt, now));
  return { meals: [...today].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    calories: sumKnown(today.map(meal => meal.calories)),
    protein: sumKnown(today.map(meal => meal.macros?.protein_g)),
    carbs: sumKnown(today.map(meal => meal.macros?.carbs_g)),
    fat: sumKnown(today.map(meal => meal.macros?.fat_g)),
    fiber: sumKnown(today.map(meal => meal.macros?.fiber_g)) };
}
export function validTarget(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}
