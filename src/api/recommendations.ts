import { api } from './client';

export type RecommendationType = 'workout' | 'rest' | 'eat_more' | 'maintain';
export type Intensity = 'low' | 'moderate' | 'high';
export type Location = 'outdoor' | 'indoor' | 'either';
export type WeatherCondition = 'hot' | 'rainy' | 'pleasant';

// Descriptive goal taxonomy (plus legacy values the backend still normalizes).
export type GoalParam =
  | 'weight_loss'
  | 'muscle_gain'
  | 'body_recomposition'
  | 'maintain'
  | 'lose'
  | 'gain';

export interface Balance {
  caloriesIn: number;
  caloriesBurnedExercise: number;
  tdee: number;
  target: number;
  net: number;
  surplus: number;
  status: 'surplus' | 'deficit' | 'on_target';
}

export interface Recommendation {
  type: RecommendationType;
  intensity: Intensity;
  durationMin: number;
  location: Location;
  title: string;
  reason: string;
  surplus: number;
}

export interface RecommendationResponse {
  profile: { sex: string; weightKg: number; heightCm: number; age: number };
  activityLevel: string;
  goal: GoalParam;
  bmr: number;
  balance: Balance;
  recommendation: Recommendation;
}

export interface RecommendationParams {
  sex?: string;
  weightKg?: number;
  heightCm?: number;
  age?: number;
  activityLevel?: string;
  goal?: GoalParam;
  caloriesIn?: number;
  caloriesBurnedExercise?: number;
  weather?: WeatherCondition;
}

export async function getRecommendations(
  params: RecommendationParams = {},
): Promise<RecommendationResponse> {
  const res = await api.get<RecommendationResponse>('/recommendations', { params });
  return res.data;
}
