import { api } from './client';
import { getDeviceId } from '../storage/device';

export interface MacroBreakdown {
  actual: number;
  target: number;
  score: number;
  color: 'green' | 'yellow' | 'red';
  status: 'on_track' | 'low' | 'high';
  tip: string;
}

export interface MacroScoreResponse {
  date: string;
  overallScore: number;
  overallColor: 'green' | 'yellow' | 'red';
  calories: { actual: number; target: number };
  hydration: { actual: number; target: number; score: number; color: string };
  breakdown: {
    protein: MacroBreakdown;
    carbs: MacroBreakdown;
    fat: MacroBreakdown;
    fiber: MacroBreakdown;
  };
  mealCount: number;
}

export interface MacroGoals {
  caloriesTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  fiberTarget: number;
  waterMlTarget: number;
}

export interface TrendPoint {
  date: string;
  overallScore: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  hydration: number;
  calories: number;
}

export async function getMacroScore(date?: string): Promise<MacroScoreResponse> {
  const userId = await getDeviceId();
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const res = await api.get<MacroScoreResponse>('/macro-score', {
    params,
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function getMacroGoals(): Promise<MacroGoals> {
  const userId = await getDeviceId();
  const res = await api.get<MacroGoals>('/macro-score/goals', {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function updateMacroGoals(goals: Partial<MacroGoals>): Promise<MacroGoals> {
  const userId = await getDeviceId();
  const res = await api.put<MacroGoals>('/macro-score/goals', goals, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function getMacroTrend(days: number = 7): Promise<TrendPoint[]> {
  const userId = await getDeviceId();
  const res = await api.get<{ trend: TrendPoint[] }>('/macro-score/trend', {
    params: { days },
    headers: { 'x-user-id': userId },
  });
  return res.data.trend;
}
