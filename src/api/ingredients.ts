import { api } from './client';
import { Macros } from '../storage/meals';

export interface IngredientResult {
  id: string;
  fdcId: string | null;
  catalogId?: string;
  revision?: string;
  preparation?: string;
  nutritionStatus?: string;
  verificationLevel?: 'SOURCE_BACKED_FULL' | 'PARTIALLY_SOURCE_BACKED' | 'GENERIC_COMPOSITION' | 'ESTIMATED' | 'REVIEW_CONFLICT';
  reviewRequired?: boolean;
  favorite?: boolean;
  servings?: { id: string; label: string; grams: number; estimated: boolean }[];
  provenance?: { source?: string; source_url?: string; carb_definition?: string; total_carb_estimation?: string; confirmed_nutrients?: string; estimated_nutrients?: string; verification_explanation?: string; estimate_warning?: string; basis?: string };
  name: string;
  caloriesPer100g: number;
  macrosPer100g: Macros;
  // Where the data came from: 'user-cache' | 'central-cache' | 'usda' | 'mock…'
  source: string;
}

// Authenticated catalog-first search; identity comes from the bearer session.
export async function searchIngredients(q: string, filters: { preparation?: string; productType?: string } = {}): Promise<IngredientResult[]> {
  const res = await api.get<{ results: IngredientResult[] }>('/ingredients/search', {
    params: { q, ...filters },
  });
  return res.data.results ?? [];
}

export function verificationLabel(item: IngredientResult): string {
  if (item.verificationLevel === 'SOURCE_BACKED_FULL') return 'Source-backed';
  if (item.verificationLevel === 'PARTIALLY_SOURCE_BACKED') return /calor|energy|kcal/i.test(item.provenance?.confirmed_nutrients || '') ? 'Calories source-backed · Macros may be estimated' : 'Partially source-backed';
  if (item.verificationLevel === 'REVIEW_CONFLICT') return 'Needs review · Estimated';
  if (item.verificationLevel) return 'Estimated';
  return item.source === 'humai-catalog' ? 'Review source' : 'USDA data';
}
export async function loadIngredientSelections(favorite = false): Promise<IngredientResult[]> {
  return (await api.get('/ingredients/selections', { params: { favorite } })).data.results || [];
}
export async function selectIngredient(id: string, favorite?: boolean): Promise<void> {
  await api.put(`/ingredients/${encodeURIComponent(id)}/selection`, favorite == null ? {} : { favorite });
}
