// Per-account water volume display unit. Storage stays milliliters — this only
// changes how amounts are shown. accountKey scoping keeps it user-specific.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountKey } from './session';
import { VolumeUnit, VOLUME_UNITS } from '../util/units';

const KEY = 'water.volumeUnit.v1';

export async function loadVolumeUnit(): Promise<VolumeUnit> {
  try {
    const raw = await AsyncStorage.getItem(accountKey(KEY));
    return VOLUME_UNITS.some(u => u.key === raw) ? (raw as VolumeUnit) : 'ml';
  } catch {
    return 'ml';
  }
}

export async function saveVolumeUnit(unit: VolumeUnit): Promise<void> {
  try { await AsyncStorage.setItem(accountKey(KEY), unit); } catch { /* display pref — safe to drop */ }
}
