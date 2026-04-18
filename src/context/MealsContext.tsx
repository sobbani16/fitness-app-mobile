import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  LoggedMeal,
  addMeal as storageAdd,
  loadMealsFor,
  removeMeal as storageRemove,
  sumCalories,
} from '../storage/meals';

interface MealsContextValue {
  meals: LoggedMeal[];
  totalCalories: number;
  loading: boolean;
  add: (m: LoggedMeal) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const MealsContext = createContext<MealsContextValue | undefined>(undefined);

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
