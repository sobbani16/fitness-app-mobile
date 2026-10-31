import { api } from './client';

export interface LoggedWeight {
  entry: { id: string; weightKg: number; recordedAt: string };
  profile: Record<string, unknown>;
}

/** Records an explicit weight measurement, even when it matches the last value. */
export async function logWeight(weightKg: number): Promise<LoggedWeight> {
  const res = await api.post<LoggedWeight>('/me/profile/weight', { weightKg });
  return res.data;
}
