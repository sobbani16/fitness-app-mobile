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
export const updateProgressPreferences = (restDays: number[]) =>
  api.put('/daily-progress/preferences', { restDays }).then(r => r.data.preferences);


export interface ProgressOpportunity {
  id: string; component: string; actionType: string; title: string; explanation: string;
  remainingPoints: number; projectedPoints: number; version: number; assumptions: string;
  confidence: string; status: string; suggestedNext: string;
}
export interface StreakInfo { current: number; longest: number; todayQualified: boolean; qualifyRule: string; paused: boolean; explanation: string; }
export const getProgressOpportunities = () => api.get<{ top: ProgressOpportunity[]; earned: number; applicable: number }>('/progress-coach/opportunities').then(r => r.data);
export const getStreak = () => api.get<{ streak: StreakInfo }>('/progress-coach/streak').then(r => r.data.streak);
