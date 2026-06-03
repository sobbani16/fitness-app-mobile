import { api } from './client';
import { MealType, Macros } from '../storage/meals';

export interface MealAnalysis {
  name: string;
  calories: number;
  macros: Macros;
  feedback: string;
  source: string;
  hasPhoto: boolean;
}

export interface AnalyzeMealRequest {
  description?: string;
  mealType?: MealType;
  hasPhoto?: boolean;
}

export async function analyzeMeal(req: AnalyzeMealRequest): Promise<MealAnalysis> {
  const res = await api.post<MealAnalysis>('/meals/analyze', req);
  return res.data;
}

export interface FoodDetection {
  foodName: string;
  caloriesPer100g: number;
  suggestedPortionGrams: number;
  estimatedCalories: number;
  macrosPer100g: Macros;
  source: string;
  confidence: number;
  hasPhoto: boolean;
}

export async function detectFood(req: AnalyzeMealRequest): Promise<FoodDetection> {
  const res = await api.post<FoodDetection>('/meals/detect', req);
  return res.data;
}
