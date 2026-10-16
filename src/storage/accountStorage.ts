import { LEGACY_DEVICE_KEY, LEGACY_DATA_KEY } from './legacyKeys';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { blockAccountWrites, accountWritesBlocked } from './accountWriteState';
export { blockAccountWrites } from './accountWriteState';
let writes: Promise<unknown> = Promise.resolve();
function serialize<T>(action: () => Promise<T>): Promise<T> {
  const result = writes.then(action, action); writes = result.catch(() => {}); return result;
}
export const accountStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
  setItem(key: string, value: string) {
    return serialize(async () => {
      if (accountWritesBlocked(key.split(':')[0])) return;
      await AsyncStorage.setItem(key, value);
    });
  },
};
export async function purgeAccountCache(userId: string) {
  blockAccountWrites(userId);
  await serialize(async () => {
    const allKeys = await AsyncStorage.getAllKeys();
    const ownsLegacy = await AsyncStorage.getItem(LEGACY_DEVICE_KEY) === userId;
    const keys = allKeys.filter(key => key.startsWith(`${userId}:`) || (ownsLegacy && (LEGACY_DATA_KEY.test(key) || key === LEGACY_DEVICE_KEY)));
    if (keys.length) {
      const entries = await AsyncStorage.multiGet(allKeys);
      const { removeOwnedPhotoCopies } = require('./accountMedia') as typeof import('./accountMedia');
      removeOwnedPhotoCopies(entries.filter(([key]) => keys.includes(key)), entries.filter(([key]) => !keys.includes(key)));
    }
    if (keys.length) await AsyncStorage.multiRemove(keys);
  });
}
export async function exportAccountCache(userId: string) {
  await writes;
  const ownsLegacy = await AsyncStorage.getItem(LEGACY_DEVICE_KEY) === userId;
  const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(`${userId}:`) || (ownsLegacy && LEGACY_DATA_KEY.test(key)));
  return Object.fromEntries((await AsyncStorage.multiGet(keys)).map(([key, value]) => {
    let parsed: unknown = value;
    try { parsed = value === null ? null : JSON.parse(value); } catch { /* Preserve raw values. */ }
    return [key.startsWith(`${userId}:`) ? key.slice(userId.length + 1) : `legacy-unimported/${key}`, parsed];
  }));
}
