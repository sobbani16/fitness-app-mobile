import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'fitness.meals.v1.';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Macros {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface LoggedMeal {
  id: string;
  createdAt: string;        // ISO
  name: string;
  calories: number;
  macros: Macros;
  description?: string;
  mealType?: MealType;
  feedback: string;
  source: string;
  photoUri?: string;
}

export function todayKey(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${KEY_PREFIX}${yyyy}-${mm}-${dd}`;
}

export async function loadMealsFor(date: Date = new Date()): Promise<LoggedMeal[]> {
  try {
    const raw = await AsyncStorage.getItem(todayKey(date));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LoggedMeal[]) : [];
  } catch {
    return [];
  }
}

export async function addMeal(meal: LoggedMeal): Promise<LoggedMeal[]> {
  const list = await loadMealsFor(new Date(meal.createdAt));
  const next = [...list, meal];
  await AsyncStorage.setItem(todayKey(new Date(meal.createdAt)), JSON.stringify(next));
  return next;
}

export async function removeMeal(id: string, date: Date = new Date()): Promise<LoggedMeal[]> {
  const list = await loadMealsFor(date);
  const next = list.filter((m) => m.id !== id);
  await AsyncStorage.setItem(todayKey(date), JSON.stringify(next));
  return next;
}

export async function clearMealsFor(date: Date = new Date()): Promise<void> {
  await AsyncStorage.removeItem(todayKey(date));
}

export function sumCalories(meals: LoggedMeal[]): number {
  return meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
}
