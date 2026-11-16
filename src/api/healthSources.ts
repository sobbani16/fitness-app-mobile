import { api } from './client';

// ---- Wearable-ready health platform ------------------------------------------
export type Provider = { id: string; label: string; availability: 'available' | 'not_available' | 'internal'; kind: string; metrics: string[]; pairing: boolean; firmware: boolean; note?: string };
export type HealthSource = { id: string; provider: string | Provider; connectionState: string; permissionScopes: string[]; lastSyncAt: string | null; lastAttemptAt: string | null; lastError: string | null };
export type Measurement = { id: string; metric: string; value: number | null; unit: string; startAt: string; endAt: string | null; provider: string; quality: string | null };
export type DailyPoint = { day: string; metric: string; value: number; unit: string; provider: string; providersSeen: string[]; recordCount: number };
export type Recovery = { status: 'OK' | 'INSUFFICIENT_DATA'; coverage: Record<string, number>; trends?: { metric: string; direction: string; note: string }[]; disclaimer?: string; note?: string };
export type IngestResult = { accepted: number; duplicates: number; rejected: number; errors: { index: number; error: string }[] };

export const listProviders = () => api.get('/health-sources/providers').then((r) => r.data.providers as Promise<Provider[]>);
export const listSources = () => api.get('/health-sources/sources').then((r) => r.data.sources as Promise<HealthSource[]>);
export const connectSource = (provider: string, scopes: string[] = []) => api.post(`/health-sources/sources/${provider}/connect`, { scopes }).then((r) => r.data.source as Promise<HealthSource>);
export const disconnectSource = (provider: string) => api.post(`/health-sources/sources/${provider}/disconnect`).then((r) => r.data);
export const deleteSourceData = (provider: string) => api.delete(`/health-sources/sources/${provider}/data`).then((r) => r.data);
export const ingestMeasurements = (provider: string, records: Record<string, unknown>[]) => api.post(`/health-sources/sources/${provider}/measurements`, { records }).then((r) => r.data as Promise<IngestResult>);
export const getSeries = (metric: string, days = 30) => api.get(`/health-sources/metrics/${metric}`, { params: { from: new Date(Date.now() - days * 864e5).toISOString() } }).then((r) => r.data.records as Promise<Measurement[]>);
export const getDailySummary = (metric: string, days = 14) => api.get(`/health-sources/metrics/${metric}/daily`, { params: { days } }).then((r) => r.data as Promise<{ metric: string; summary: DailyPoint[] }>);
export const getRecovery = () => api.get('/health-sources/recovery').then((r) => r.data as Promise<Recovery>);
