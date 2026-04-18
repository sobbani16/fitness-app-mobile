import { api } from './client';
import { Profile } from '../storage/profile';
import { Balance } from './recommendations';

type BalanceStatus = Balance['status'];

export interface HistoryEntry {
  date: string;
  caloriesIn: number;
  caloriesBurnedExercise: number;
  mealCount: number;
  target: number;
  net: number;
  surplus: number;
  status: BalanceStatus;
  logged: boolean;
}

export interface HistoryResponse {
  tdee: number;
  entries: HistoryEntry[];
  streaks: { logged: number; onTarget: number };
}

export interface HistoryRequest {
  profile: Pick<Profile, 'sex' | 'weightKg' | 'heightCm' | 'age' | 'activityLevel' | 'goal'>;
  days: Array<{ date: string; caloriesIn: number; caloriesBurnedExercise?: number; mealCount?: number }>;
}

export async function getHistory(req: HistoryRequest): Promise<HistoryResponse> {
  const res = await api.post<HistoryResponse>('/summary/history', req);
  return res.data;
}
