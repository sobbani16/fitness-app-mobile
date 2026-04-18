import { api } from './client';

export type HealthResponse = { status: string; time: string };

export async function getHealth(): Promise<HealthResponse> {
  const res = await api.get<HealthResponse>('/health');
  return res.data;
}
