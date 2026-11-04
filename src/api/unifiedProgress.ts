import { api } from './client';

export type WeekBucket = {
  weekOf: string; workouts: number; loggedDays: number; habitsDone: number;
  sleepNights: number | null; avgSleepHours: number | null;
};
export type Moment = { key: string; tone: 'celebrate' | 'encourage' | 'steady'; title: string; detail: string; evidence: string };
export type LeoCue = { state: 'celebrate' | 'encourage' | 'steady'; because: string | null; message: string };
export type UnifiedProgress = {
  version: string; timezone: string; windowWeeks: number;
  weekly: WeekBucket[];
  weight: { entries: number; firstKg: number | null; lastKg: number | null; deltaKg: number | null; since: string | null };
  loggingStreakDays: number | null;
  checkInsSent: number | null; checkInsReviewed: number | null;
  goals: { planTitle: string | null; targetDate: string | null; open: number; met: number; total: number } | null;
  moments: Moment[]; leo: LeoCue; note: string;
};

export async function getUnifiedProgress(weeks = 8): Promise<UnifiedProgress> {
  return (await api.get('/me/progress/unified', { params: { weeks } })).data;
}
