import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { getSession, saveSession, Session } from '../storage/session';
import { accountStorage } from '../storage/accountStorage';
import { LEGACY_DEVICE_KEY as DEVICE_KEY, LEGACY_DATA_KEY as LEGACY_KEY } from '../storage/legacyKeys';
export async function legacyDeviceId() { return AsyncStorage.getItem(DEVICE_KEY); }
export async function finishLegacyUpgrade() {
  const session = getSession(), legacyId = await legacyDeviceId();
  if (!session?.user.emailVerifiedAt || !legacyId || session.user.id !== legacyId) throw new Error('Sign in to the approved migrated account before importing this device’s old records.');
  const keys = (await AsyncStorage.getAllKeys()).filter(key => LEGACY_KEY.test(key));
  for (const key of keys) {
    if (getSession()?.token !== session.token) throw new Error('Account changed. Migration paused.');
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) continue;
    let value: any;
    try { value = JSON.parse(raw); } catch { throw new Error('An old record is unreadable. Nothing was removed; contact support.'); }
    if (key.startsWith('fitness.meals.') && !Array.isArray(value)) throw new Error('An old meal record is unreadable. Nothing was removed.');
    if (key === 'fitness.profile.v1' && (!value || typeof value !== 'object' || Array.isArray(value))) throw new Error('The old profile is unreadable. Nothing was removed.');
    if (key.startsWith('fitness.meals.')) value = value.map((meal: any) => ({ ...meal, source: 'legacy-local' }));
    const destination = `${legacyId}:${key}`;
    const serialized = JSON.stringify(value);
    const existing = await AsyncStorage.getItem(destination);
    if (existing !== null && existing !== serialized) throw new Error('Old and current device records conflict. Both copies were kept; contact support.');
    if (existing === null) await accountStorage.setItem(destination, serialized);
  }
  // Preserve all source keys until the entire copy succeeds; retries never overwrite scoped data.
  if (getSession()?.token !== session.token) throw new Error('Account changed. Migration paused.');
  await AsyncStorage.multiRemove([...keys, DEVICE_KEY]);
}
export async function migrateLegacyAccount(token: string, password: string) {
  const current = getSession();
  if (!current) throw new Error('Sign in first.');
  const { data } = await api.post<Session>('/me/legacy-migration/redeem', { token: token.trim(), password }, { timeout: 45000 });
  if (getSession()?.token !== current.token) throw new Error('Account changed. Sign in again to the migrated account.');
  await saveSession(data);
  // A lost response/storage failure can be recovered by signing in with the same verified email/password.
  if (await legacyDeviceId() === data.user.id) await finishLegacyUpgrade();
}
