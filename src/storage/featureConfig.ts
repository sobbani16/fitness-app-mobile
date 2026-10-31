// Per-account cache of the last successful feature-config fetch. Account-keyed
// like all AsyncStorage state, so logout/account-switch/purge clears it.
// Last-known-good config lets the app start correctly while offline.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountKey } from './session';
import { FeatureMap } from '../config/featureKeys';

const KEY = 'featureConfig.v1';

interface StoredFeatureConfig {
  configVersion: string;
  savedAt: number;
  features: FeatureMap;
}

export async function loadFeatureConfig(): Promise<StoredFeatureConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(accountKey(KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredFeatureConfig;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.features !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveFeatureConfig(configVersion: string, features: FeatureMap): Promise<void> {
  try {
    const state: StoredFeatureConfig = { configVersion, savedAt: Date.now(), features };
    await AsyncStorage.setItem(accountKey(KEY), JSON.stringify(state));
  } catch { /* cache — safe to drop */ }
}
