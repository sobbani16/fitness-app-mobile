import { api } from './client';

// "What should I eat now?" — rule-based suggestions with hard eligibility.
// The backend filters allergies, exclusions, and dietary restrictions before
// ranking; the context object explains that suggestions never scale to a
// provisional energy deficit.

export interface MealOption {
  recipeId: string | null;
  name: string;
  mealType: string;
  cuisine: string | null;
  servings?: number;
  nutrition: { calories: number | null; proteinG?: number | null; carbsG?: number | null; fatG?: number | null; fiberG?: number | null };
  portionG?: number | null;
  reasons: string[];
  fromPlan?: boolean;
}

export interface MealSuggestResponse {
  version: string;
  occasion: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  timeZone: string;
  context: {
    intakeTargetKcal: number | null;
    intakeTargetSource: string | null;
    loggedKcalToday: number | null;
    intakeCompleteness: 'none' | 'partial';
    projectedExpenditureKcal: number | null;
    note: string;
  };
  eligibility: { allergiesChecked: number; restrictionsApplied: string[]; excludedRecipes: number; disclaimer: string };
  options: MealOption[];
  emptyReason: string | null;
}

export function getMealSuggestions(occasion?: string, limit = 5): Promise<MealSuggestResponse> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return api.get<MealSuggestResponse>('/meal-suggest', { params: { occasion, limit, tz } }).then(r => r.data);
}
