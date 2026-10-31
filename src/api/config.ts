import { api } from './client';
import { FeatureMap } from '../config/featureKeys';

export interface FeatureConfigResponse {
  configVersion: string;
  refreshAfterSeconds: number;
  features: FeatureMap;
}

export async function getFeatureConfig(): Promise<FeatureConfigResponse> {
  const { data } = await api.get<FeatureConfigResponse>('/config/features');
  return {
    configVersion: String(data?.configVersion ?? ''),
    refreshAfterSeconds: Math.min(Math.max(Number(data?.refreshAfterSeconds) || 60, 30), 600),
    features: (data?.features && typeof data.features === 'object' ? data.features : {}) as FeatureMap,
  };
}
