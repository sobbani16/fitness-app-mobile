import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  LoggedMeal,
  addMeal as storageAdd,
  loadMealsFor,
  removeMeal as storageRemove,
  sumCalories,
} from '../storage/meals';
import { api } from '../api/client';
import { getDeviceId } from '../storage/device';

interface MealsContextValue {
  meals: LoggedMeal[];
  totalCalories: number;
  loading: boolean;
  add: (m: LoggedMeal) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const MealsContext = createContext<MealsContextValue | undefined>(undefined);

/**
 * Sync a meal to the backend FoodLog table so the Health Score engine
 * can see it. Fire-and-forget — local storage is the source of truth.
 */
async function syncMealToBackend(m: LoggedMeal) {
  try {
    const userId = await getDeviceId();
    await api.post('/food-logs', {
      foodName: m.name,
      quantityG: 0,
      calories: m.calories || 0,
      proteinG: m.macros?.protein_g || 0,
      carbsG: m.macros?.carbs_g || 0,
      fatG: m.macros?.fat_g || 0,
      fiberG: 0,
      mealType: m.mealType || 'meal',
    }, { headers: { 'x-user-id': userId } });
  } catch {
    // Best-effort sync — don't block the local UX
  }
}

export function MealsProvider({ children }: { children: React.ReactNode }) {
  const [meals, setMeals] = useState<LoggedMeal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await loadMealsFor(new Date());
    setMeals(list);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const add = useCallback(async (m: LoggedMeal) => {
    const next = await storageAdd(m);
    setMeals(next);
    // Sync to backend so Health Score engine sees the meal
    syncMealToBackend(m);
  }, []);

  const remove = useCallback(async (id: string) => {
    const next = await storageRemove(id, new Date());
    setMeals(next);
  }, []);

  return (
    <MealsContext.Provider
      value={{ meals, totalCalories: sumCalories(meals), loading, add, remove, refresh }}
    >
      {children}
    </MealsContext.Provider>
  );
}

export function useMeals(): MealsContextValue {
  const ctx = useContext(MealsContext);
  if (!ctx) throw new Error('useMeals must be used within a MealsProvider');
  return ctx;
}
