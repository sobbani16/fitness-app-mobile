import { api } from './client';
import { getDeviceId } from '../storage/device';

export async function syncWater(amountMl: number, date?: string): Promise<{ amountMl: number; date: string }> {
  const userId = await getDeviceId();
  const res = await api.put<{ amountMl: number; date: string }>(
    '/daily-stats/water/replace',
    { amountMl, date },
    { headers: { 'x-user-id': userId } },
  );
  return res.data;
}

export async function getWater(date?: string): Promise<{ amountMl: number; date: string }> {
  const userId = await getDeviceId();
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const res = await api.get<{ amountMl: number; date: string }>('/daily-stats/water', {
    params,
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function addWater(amountMl: number): Promise<{ date: string }> {
  const userId = await getDeviceId();
  const res = await api.post<{ date: string }>('/daily-stats/water', { amountMl }, { headers: { 'x-user-id': userId } });
  return res.data;
}

export async function getLastWaterAt(): Promise<string | null> {
  const userId = await getDeviceId();
  const res = await api.get<{ loggedAt: string | null }>('/daily-stats/water/last', { headers: { 'x-user-id': userId } });
  return res.data.loggedAt;
}

export async function syncSteps(steps: number, date?: string): Promise<{ steps: number; date: string }> {
  const userId = await getDeviceId();
  const res = await api.post<{ steps: number; date: string }>(
    '/daily-stats/steps',
    { steps, date },
    { headers: { 'x-user-id': userId } },
  );
  return res.data;
}

export async function getSteps(date?: string): Promise<{ steps: number; date: string }> {
  const userId = await getDeviceId();
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const res = await api.get<{ steps: number; date: string }>('/daily-stats/steps', {
    params,
    headers: { 'x-user-id': userId },
  });
  return res.data;
}
