import { api } from './client';

// Backend-owned energy contract (energy-v1). The same numbers the web app
// renders — always prefer this over local math when reachable; the device
// fallback estimate in services/energy.ts is for offline use only.

export type EnergySource = string; // 'wearable:healthkit' | 'estimate:mifflin_st_jeor' | ...

export interface EnergySummary {
  version: string;
  date: string;
  timeZone: string;
  day: { startAt: string; endAt: string; elapsedFraction: number; isToday: boolean; isComplete: boolean };
  resting: { soFarKcal: number | null; fullDayKcal: number | null; source: EnergySource | null; coverageMin: number | null };
  active: { soFarKcal: number | null; source: EnergySource | null; provider: string | null; coverageMin: number | null };
  expenditure: {
    soFarKcal: number | null;
    projectedDayKcal: number | null;
    tdeeEstimateKcal: number | null;
    basis: string[];
  };
  intake: { loggedKcal: number | null; mealCount: number; lastLoggedAt: string | null; completeness: 'none' | 'partial' };
  target: { intakeKcal: number | null; source: string | null };
  balance: { provisionalKcal: number | null; provisionalNote: string | null; completedDayKcal: number | null };
  sync: { lastSyncAt: string | null; stale: boolean };
  dataGaps: string[];
  explanation: string;
}

export function getEnergySummary(date?: string): Promise<EnergySummary> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return api.get<EnergySummary>('/energy/summary', { params: { date, tz } }).then(r => r.data);
}
