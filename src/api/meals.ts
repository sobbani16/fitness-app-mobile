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
