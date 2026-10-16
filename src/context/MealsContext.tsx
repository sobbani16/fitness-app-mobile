import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  LoggedMeal,
  loadMealsFor,
  sumCalories,
} from '../storage/meals';
import { flushMeals, saveMealChange, reconcileMealsFor } from '../services/mealSync';

interface MealsContextValue {
  meals: LoggedMeal[];
  totalCalories: number;
  loading: boolean;
  add: (m: LoggedMeal) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  syncAll: () => Promise<void>;
  syncError: string | null;
}

const MealsContext = createContext<MealsContextValue | undefined>(undefined);

export function MealsProvider({ children }: { children: React.ReactNode }) {
  const [syncError, setSyncError] = useState<string | null>(null);
  const [meals, setMeals] = useState<LoggedMeal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await loadMealsFor(new Date());
    setMeals(list);
    try { setMeals(await reconcileMealsFor()); setSyncError(null); }
    catch { setSyncError('Showing saved meals. Server sync is pending.'); }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const add = useCallback(async (m: LoggedMeal) => {
    const next = await saveMealChange(m);
    setMeals(next);
    // Sync to backend so Health Score engine sees the meal
    flushMeals().then(()=>setSyncError(null)).catch(()=>setSyncError('Meals saved on this device. Sync pending; refresh when connected.'));
  }, []);

  const remove = useCallback(async (id: string) => {
    const next = await saveMealChange(id);
    setMeals(next);
    flushMeals().catch(()=>setSyncError('Deletion pending sync.'));
  }, []);

  const syncAll = useCallback(async () => {
    try { setMeals(await reconcileMealsFor()); setSyncError(null); }
    catch (e) { setSyncError('Meals saved on this device. Sync pending.'); throw e; }
  }, []);

  return (
    <MealsContext.Provider
      value={{ meals, totalCalories: sumCalories(meals), loading, add, remove, refresh, syncAll, syncError }}
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
