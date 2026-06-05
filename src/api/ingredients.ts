import { api } from './client';
import { getDeviceId } from '../storage/device';
import { Macros } from '../storage/meals';

export interface IngredientResult {
  id: string;
  fdcId: string;
  name: string;
  caloriesPer100g: number;
  macrosPer100g: Macros;
  // Where the data came from: 'user-cache' | 'central-cache' | 'usda' | 'mock…'
  source: string;
}

/**
 * Search ingredients (e.g. "chicken", "chickpeas") via the backend's three-tier
 * cache (user table -> central table -> USDA). The device id is sent so the
 * backend can read/write the per-user ingredient table.
 */
export async function searchIngredients(q: string): Promise<IngredientResult[]> {
  const userId = await getDeviceId();
  const res = await api.get<{ results: IngredientResult[] }>('/ingredients/search', {
    params: { q },
    headers: { 'x-user-id': userId },
  });
  return res.data.results ?? [];
}
