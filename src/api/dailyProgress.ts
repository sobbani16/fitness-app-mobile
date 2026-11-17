import { api } from './client';

export type ComponentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'GOAL_MET' | 'INSUFFICIENT_DATA' | 'NOT_APPLICABLE';

export interface ProgressComponent {
  key: 'nutrition' | 'hydration' | 'activity' | 'sleep' | 'habits' | 'planActions' | string;
  weight: number;
  status: ComponentStatus;
  progress: number;
  earned: number;
  applicable: number;
  note?: string;
  source?: string[];
}

export interface DailyProgress {
  dayKey: string;
  timezone: string;
  version: number;
  earned: number;
  applicable: number;
  components: ProgressComponent[];
  nextAction: { component: string; note?: string } | null;
  computedAt: string;
  label: string;
}

// V2 Daily Goal Progress — "how much of my planned day is done". Distinct from
// the legacy Health Score (healthScore.ts), which stays for history only.
export const getTodayProgress = (tz?: string) =>
  api.get<{ progress: DailyProgress }>('/daily-progress/today', { params: tz ? { tz } : undefined }).then(r => r.data.progress);
export const getProgressHistory = (days = 14) =>
  api.get<{ days: { dayKey: string; earned: number; version: number }[] }>('/daily-progress/history', { params: { days } }).then(r => r.data.days);
