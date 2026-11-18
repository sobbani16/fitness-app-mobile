import { api } from './client';
import { IngredientResult } from './ingredients';

export interface FoodRecipeResult {
  type: 'recipe';
  id: string;
  name: string;
  cuisine: string | null;
  region: string | null;
  mealType: string | null;
  servings: number;
  portionG: number | null;
  perServing: { calories: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null; fiberG: number | null };
  verificationLevel: string;
  reviewStatus: string;
  source: string;
}

export interface UnifiedSearchResponse {
  results: Array<(IngredientResult & { type: 'ingredient' }) | FoodRecipeResult>;
  counts: { ingredients: number; recipes: number };
  warnings?: { code: string; message: string }[];
}

export interface RecipeMatchResult {
  recipe: {
    id: string; name: string; cuisine: string | null; region: string | null; mealType: string | null;
    servings: number; portionG: number | null;
    perServing: { calories: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null; fiberG: number | null };
    verificationLevel: string;
  };
  matched: string[];
  missing: string[];
  coverage: number;
}

export async function searchFoods(q: string, opts: { type?: 'ingredient' | 'recipe'; cuisine?: string; mealType?: string; limit?: number } = {}): Promise<UnifiedSearchResponse> {
  const res = await api.get<UnifiedSearchResponse>('/foods/search', { params: { q, limit: opts.limit ?? 20, type: opts.type, cuisine: opts.cuisine, mealType: opts.mealType } });
  return res.data;
}

export async function matchRecipesByIngredients(ingredients: string[]): Promise<{ results: RecipeMatchResult[]; unresolvedInputs: string[] }> {
  const res = await api.post('/recipes/match', { ingredients });
  return res.data;
}
