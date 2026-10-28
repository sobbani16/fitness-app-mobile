import { api } from './client';

export interface HealthSummary {
  syncedAt: string;
  windowDays: number;
  steps: { status: 'fresh' | 'stale' | 'no_data'; latest: { value: number; unit: string; date: string; source: string; distanceKm: number | null } | null; series: { date: string; value: number; source: string }[] };
  water: { status: string; latest: { totalMlToday: number | null; unit: string; source: string; loggedAt: string } | null; series: { totalMl: number }[] };
  sleep: { status: string; latest: { hours: number; unit: string; source: string; sleepStart: string; sleepEnd: string; sleepScore: number | null } | null; series: { date: string; hours: number; source: string }[] };
  workouts: { status: string; latest: { type: string; durationMinutes: number; source: string; startedAt: string } | null; count: number; series: { date: string; type: string; durationMinutes: number; source: string }[] };
  sources: string[];
}

export function getHealthSummary(days: 7 | 30 | 90 = 7): Promise<HealthSummary> {
  return api.get<HealthSummary>('/health-data/summary', { params: { days } }).then(r => r.data);
}
