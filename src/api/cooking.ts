import { api } from './client';

export interface RecipeLine {
  ingredientId: string | null;
  ingredientName: string;
  amountG: number;
  optional: boolean;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
}

export interface RecipeStep {
  step: number;
  text: string;
  minutes?: number;
  safetyNote?: string | null;
  optionalIngredients?: string[];
}

export interface RecipeDetail {
  id: string;
  recipeName: string;
  cuisine: string | null;
  region: string | null;
  mealType: string | null;
  servings: number;
  portionG: number | null;
  finishedYieldG: number | null;
  prepMinutes: number | null;
  instructions: RecipeStep[] | null;
  safetyNotes: string[] | null;
  allergens: string[];
  reviewStatus: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  description: string | null;
  ingredients: RecipeLine[];
  engagement: { favorite: boolean; rating: number | null; notes: string | null } | null;
}

export async function getRecipeDetail(id: string): Promise<RecipeDetail> {
  const res = await api.get<RecipeDetail>(`/recipes/${encodeURIComponent(id)}`);
  return res.data;
}

export async function setRecipeEngagement(id: string, data: { favorite?: boolean; rating?: number; notes?: string; customData?: unknown }) {
  const res = await api.put(`/recipes/${encodeURIComponent(id)}/engagement`, data);
  return res.data.engagement;
}

export interface MatchItemInput { name?: string; ingredientId?: string; amountG?: number }
export interface MatchResultV2 {
  recipe: {
    id: string; name: string; cuisine: string | null; region: string | null; mealType: string | null;
    servings: number; portionG: number | null; prepMinutes: number | null;
    perServing: { calories: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null; fiberG: number | null };
    verificationLevel: string; allergens: string[];
  };
  availableIngredients: { name: string; amountG: number }[];
  missingRequired: { name: string; amountG: number }[];
  missingOptional: { name: string; amountG: number }[];
  insufficientQuantities: { ingredientName: string; needG: number; haveG: number }[];
  quantityAssumed: boolean;
  coverage: number;
  matchScore: number;
  status: 'ready' | 'insufficient-quantity' | 'missing-one' | 'missing-few' | 'partial';
  reasons: string[];
}

export async function matchIngredientsV2(body: {
  items: MatchItemInput[];
  diet?: string[]; allergies?: string[]; cuisine?: string; maxPrepMinutes?: number; servings?: number; limit?: number;
}): Promise<{ results: MatchResultV2[]; totalMatched: number; unresolvedInputs: string[]; quantityAssumed: boolean; excluded: { allergy: number; diet: number; prepTime: number } }> {
  const res = await api.post('/recipes/match-ingredients', body);
  return res.data;
}

export interface CustomizeResponse {
  recipe: { id: string; name: string; servings: number; verificationLevel: string };
  changesApplied: string[];
  rejected: { change: { action?: string; ingredientName?: string }; reason: string }[];
  notes: string;
  proposedLines: { ingredientId: string | null; ingredientName: string; amountG: number; optional: boolean }[];
  perServing: { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number | null } | null;
  warnings: string[];
  provenance: { source: string; reviewRequired: boolean; nutritionRecomputed: boolean };
}

export async function customizeRecipe(id: string, body: { request: string; servings?: number; allergies?: string[] }): Promise<CustomizeResponse> {
  const res = await api.post<CustomizeResponse>(`/recipes/${encodeURIComponent(id)}/customize`, body);
  return res.data;
}

export interface GroceryItemDto {
  id: string; name: string; amountG: number | null; unitLabel: string | null;
  optional: boolean; sourceRecipeId: string | null; status: 'pending' | 'purchased' | 'skipped';
}

export async function addGroceryItems(items: { name: string; amountG?: number; unitLabel?: string; optional?: boolean; sourceRecipeId?: string }[]): Promise<GroceryItemDto[]> {
  const res = await api.post<{ items: GroceryItemDto[] }>('/grocery', { items });
  return res.data.items;
}

export async function getGroceryList(status = 'pending'): Promise<GroceryItemDto[]> {
  const res = await api.get<{ items: GroceryItemDto[] }>('/grocery', { params: { status } });
  return res.data.items;
}

export async function updateGroceryItem(id: string, patch: { status?: 'pending' | 'purchased' | 'skipped'; amountG?: number; name?: string }): Promise<GroceryItemDto> {
  const res = await api.patch<{ item: GroceryItemDto }>(`/grocery/${encodeURIComponent(id)}`, patch);
  return res.data.item;
}
