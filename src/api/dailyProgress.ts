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

export interface CalendarDay {
  dayKey: string; weekday: number; isToday: boolean; future: boolean; restDay: boolean;
  earned: number | null; target: number | null; version: number | null; color: 'GREEN' | 'YELLOW' | 'RED' | 'GRAY' | 'TODAY';
}
export interface ProgressCalendar {
  month: string; timezone: string; colorPolicy: number;
  days: CalendarDay[];
  summary: { daysInMonth: number; recorded: number; earned: number; targetToDate: number; monthlyTarget: number; average: number | null; daysMetTarget: number; gray: number; lastMonth?: { month: string; recorded: number; earned: number; average: number | null; daysMetTarget: number; deltaAvg: number | null } };
}
export const getProgressCalendar = (month?: string) =>
  api.get<{ calendar: ProgressCalendar }>('/daily-progress/calendar', { params: month ? { month } : undefined }).then(r => r.data.calendar);
export const getDayProgress = (dayKey: string) =>
  api.get<{ progress: DailyProgress }>('/daily-progress/today', { params: { day: dayKey } }).then(r => r.data.progress);

export interface WeekDay { dayKey: string; weekday: number; earned: number | null; target: number | null; color: string; isToday: boolean; }
export interface WeekSummary { earned: number; target: number; targetToDate: number; average: number | null; daysMetTarget: number; recorded: number; }
export interface ProgressWeek {
  weekStart: string; weekEnd: string; timezone: string;
  days: WeekDay[];
  summary: WeekSummary;
  lastWeek: { days: WeekDay[]; summary: WeekSummary };
  comparison: { deltaAvg: number | null; note: string };
}
export const getProgressWeek = () =>
  api.get<{ week: ProgressWeek }>('/daily-progress/week').then(r => r.data.week);


export interface ProgressOpportunity {
  id: string; component: string; actionType: string; title: string; explanation: string;
  remainingPoints: number; projectedPoints: number; version: number; assumptions: string;
  confidence: string; status: string; suggestedNext: string;
}
export interface StreakInfo { current: number; longest: number; todayQualified: boolean; qualifyRule: string; paused: boolean; explanation: string; }
export const getProgressOpportunities = () => api.get<{ top: ProgressOpportunity[]; earned: number; applicable: number }>('/progress-coach/opportunities').then(r => r.data);
export const getStreak = () => api.get<{ streak: StreakInfo }>('/progress-coach/streak').then(r => r.data.streak);
