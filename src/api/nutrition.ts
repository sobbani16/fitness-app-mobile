import { api } from './client';

export type NutrientCoverage = 'complete' | 'partial' | 'none' | 'no-data';
export interface NutrientEntry {
  value: number | null; unit: string; label?: string;
  reference: number | null; basis?: string;
  coverage: NutrientCoverage; logsContributing?: number; logsMissingValue?: number;
  upperLimit?: number | null; overReference?: boolean | null;
}
export interface NutritionStatus {
  windowDays: number; daysWithData: number;
  completeness: 'partial-window' | 'full-window';
  nutrients: Record<string, NutrientEntry>;
  supplementsTrackedSeparately: boolean; supplementsLogged: number | null;
  disclaimer: string;
}
export interface MealSuggestion {
  recipeId: string; recipeName: string; cuisine: string | null; servings: number;
  perServing: { calories: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null; fiberG: number | null };
  completeness: 'COMPLETE_FROM_REVIEWED_INPUTS' | 'ESTIMATE_WITH_ASSUMPTIONS' | 'UNKNOWN_COMPOSITION' | 'PARTIAL_KNOWN_INGREDIENTS';
  reviewStatus: string; score: number; why: string[]; warnings: string[];
  education: { title: string; points: string[]; portionNote: string }[];
}
export interface SuggestResponse {
  items: MealSuggestion[]; aiPersonalized: boolean; rejectedCount: number;
  context: { remaining: Record<string, number | null>; loggedCompleteness: string; constraintsApplied: { allergens: number; reviewedRules: number } };
  disclaimer: string;
}
export async function nutritionStatus(days = 1): Promise<NutritionStatus> {
  return (await api.get<NutritionStatus>('/recommendations/nutrition-status', { params: { days } })).data;
}
export async function suggestMeals(params: { occasion?: string; cuisines?: string[]; maxCookingMinutes?: number; limit?: number } = {}): Promise<SuggestResponse> {
  return (await api.get<SuggestResponse>('/recommendations/suggest', { params: { ...params, cuisines: params.cuisines?.join(',') } })).data;
}
