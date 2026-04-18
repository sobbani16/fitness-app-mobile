import { api } from './client';
import { Profile } from '../storage/profile';
import { LoggedMeal } from '../storage/meals';
import { Balance, Recommendation } from './recommendations';
import { WeatherCondition } from './weather';

export interface DailySummaryResponse {
  bmr: number;
  tdee: number;
  mealCount: number;
  balance: Balance;
  recommendation: Recommendation;
  insight: string;
}

export interface DailySummaryRequest {
  profile: Pick<Profile, 'sex' | 'weightKg' | 'heightCm' | 'age' | 'activityLevel' | 'goal'>;
  meals: Array<Pick<LoggedMeal, 'name' | 'calories' | 'mealType'>>;
  caloriesBurnedExercise?: number;
  weather?: { condition: WeatherCondition };
}

export async function getDailySummary(req: DailySummaryRequest): Promise<DailySummaryResponse> {
  const res = await api.post<DailySummaryResponse>('/summary/daily', req);
  return res.data;
}
