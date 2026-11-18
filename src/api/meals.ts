import { api } from './client';
import { MealType, Macros } from '../storage/meals';

export interface MealAnalysis extends FoodDetection {
  name: string;
  calories: number;
  macros: Macros;
  feedback: string;
  source: string;
  hasPhoto: boolean;
}

export interface AnalyzeMealRequest {
  imageDataUrl?: string;
  description?: string;
  mealType?: MealType;
  hasPhoto?: boolean;
}

export async function analyzeMeal(req: AnalyzeMealRequest): Promise<MealAnalysis> {
  const res = await api.post<MealAnalysis>('/meals/analyze', req);
  return res.data;
}

export type IngredientSource = 'VISUALLY_SUGGESTED' | 'RECIPE_INFERRED' | 'USER_CONFIRMED' | 'PACKAGE_LABEL';

export interface DetectedIngredient {
  name: string;
  confidence: number;
}

export interface RecipeMatchIngredient {
  ingredientId: string | null;
  name: string;
  amountG: number;
  optional: boolean;
}

export interface RecipeMatch {
  recipeId: string;
  name: string;
  cuisine: string | null;
  region: string | null;
  servings: number;
  portionG: number | null;
  finishedYieldG: number | null;
  reviewStatus: string;
  nutritionLevel: 'VERIFIED' | 'ESTIMATED';
  nutritionPerServing: Macros & { calories: number };
  ingredients: RecipeMatchIngredient[];
  matchScore: number;
  reasons: string[];
  visuallySuggestedIngredients: string[];
}

export interface DetectedFood {
  foodName: string;
  foodCategory: string;
  cuisineCandidates: string[];
  preparationCandidates: string[];
  visibleIngredients: DetectedIngredient[];
  possibleHiddenIngredients: string[];
  portionGrams: number | null;
  portionNote: string;
  uncertainty: string;
  recipeMatches?: RecipeMatch[];
}

export interface FoodDetection {
  uncertainty: string;
  needsReview: boolean;
  lowConfidence: boolean;
  foodName: string;
  caloriesPer100g: number;
  suggestedPortionGrams: number;
  estimatedCalories: number;
  macrosPer100g: Macros;
  source: string;
  confidence: number;
  hasPhoto: boolean;
  detectionVersion: number;
  detectedFoods?: DetectedFood[];
  needsClarification?: string[];
}

export interface NutritionLine {
  ingredientId: string;
  name: string;
  amountG: number;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  fiberKnown: boolean;
  source: string;
}

export interface IngredientNutritionResponse {
  calculationVersion: string;
  lines: NutritionLine[];
  unresolved: { name: string; amountG: number }[];
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number | null };
  totalGrams: number;
  fiberComplete: boolean;
  provenance: string;
}

export async function detectFood(req: AnalyzeMealRequest): Promise<FoodDetection> {
  const res = await api.post<FoodDetection>('/meals/detect', req);
  return res.data;
}

export async function ingredientNutrition(items: { ingredientId?: string; name?: string; amountG: number }[]): Promise<IngredientNutritionResponse> {
  const res = await api.post<IngredientNutritionResponse>('/meals/ingredient-nutrition', { items });
  return res.data;
}
