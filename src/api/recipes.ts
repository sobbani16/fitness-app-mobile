import { api } from './client';
import { Macros } from '../storage/meals';

export interface RecipeSuggestion {
  id: string;
  title: string;
  image: string | null;
}

export interface RecipeNutrition {
  id: string;
  name: string;
  servings: number;
  servingWeightGrams: number;
  calories: number;
  caloriesPer100g: number;
  macrosPer100g: Macros;
  source: string;
}

export async function searchRecipes(q: string): Promise<RecipeSuggestion[]> {
  const res = await api.get<{ results: RecipeSuggestion[] }>('/recipes/search', {
    params: { q },
  });
  return res.data.results ?? [];
}

export async function getRecipeNutrition(id: string): Promise<RecipeNutrition> {
  const res = await api.get<RecipeNutrition>(`/recipes/${encodeURIComponent(id)}/nutrition`);
  return res.data;
}
