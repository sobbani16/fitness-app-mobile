import { api } from './client';
import { getDeviceId } from '../storage/device';

export interface ScoreContributor {
  category: string;
  itemName: string;
  scoreImpact: number;
  reason: string;
}

export interface ScoreInsight {
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface ScoreComponent {
  /** null means the component had no records — never a fabricated score. */
  score: number | null;
  weight: number;
  available?: boolean;
}

export interface HealthScoreResponse {
  id: string | null;
  date: string;
  /** null when no component had data for the day. */
  score: number | null;
  status: string;
  coverage?: { available: number; total: number };
  components: {
    macro: ScoreComponent;
    condition: ScoreComponent;
    foodQuality: ScoreComponent;
    activity: ScoreComponent;
    recovery: ScoreComponent;
  };
  topContributors: ScoreContributor[];
  insights: ScoreInsight[];
  allContributors: ScoreContributor[];
}

export interface ImprovementAction {
  action: string;
  suggestion: string;
  potentialGain: number;
  priority: number;
}

export interface TrendPoint {
  date: string;
  score: number;
  status: string;
  macroScore: number;
  conditionScore: number;
  foodQualityScore: number;
  activityScore: number;
  recoveryScore: number;
}

export async function getHealthScore(date?: string): Promise<HealthScoreResponse> {
  const userId = await getDeviceId();
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const res = await api.get<HealthScoreResponse>('/health-score', {
    params,
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function getActions(date?: string): Promise<{ actions: ImprovementAction[]; totalPotentialGain: number }> {
  const userId = await getDeviceId();
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const res = await api.get('/health-score/actions', {
    params,
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function getHealthTrend(days: number = 7): Promise<TrendPoint[]> {
  const userId = await getDeviceId();
  const res = await api.get<{ trend: TrendPoint[] }>('/health-score/trend', {
    params: { days },
    headers: { 'x-user-id': userId },
  });
  return res.data.trend;
}
