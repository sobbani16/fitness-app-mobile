jest.mock('../../storage/accountMedia', () => ({ removeOwnedPhotoCopies: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('../../api/client', () => ({ api: { post: jest.fn() } }));
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveSession } from '../../storage/session';
import { finishLegacyUpgrade, migrateLegacyAccount } from '../legacyMigration';
import { api } from '../../api/client';
const legacy = 'dev-old-install';
const session = { token: 'verified-token', expiresAt: '2099-01-01', user: { id: legacy, email: 'owner@example.test', emailVerifiedAt: '2026-10-14' } };
beforeEach(async () => { await AsyncStorage.clear(); await saveSession(session); jest.clearAllMocks(); await AsyncStorage.setItem('fitness.deviceId.v1', legacy); });
it('imports real prior-app keys into the authenticated legacy account namespace', async () => {
  await AsyncStorage.setItem('fitness.profile.v1', JSON.stringify({ name: 'Old profile', goal: 'lose' }));
  await AsyncStorage.setItem('fitness.meals.v1.2026-10-09', JSON.stringify([{ id: 'original-meal' }]));
  await AsyncStorage.setItem('fitness.steps.v1.2026-10-09', '123');
  await AsyncStorage.setItem('other-account:private', 'keep');
  await finishLegacyUpgrade();
  expect(JSON.parse((await AsyncStorage.getItem(`${legacy}:fitness.meals.v1.2026-10-09`))!)[0]).toMatchObject({ id: 'original-meal', source: 'legacy-local' });
  expect(await AsyncStorage.getItem(`${legacy}:fitness.steps.v1.2026-10-09`)).toBe('123');
  expect(await AsyncStorage.getItem('fitness.deviceId.v1')).toBeNull(); expect(await AsyncStorage.getItem('other-account:private')).toBe('keep');
});
it('never copies data to an unrelated or unverified account', async () => {
  await saveSession({ ...session, user: { ...session.user, id: 'new-account' } });
  await expect(finishLegacyUpgrade()).rejects.toThrow('approved migrated account');
  expect(await AsyncStorage.getItem('fitness.deviceId.v1')).toBe(legacy);
});
it('interrupted copies are safely retried', async () => {
  await AsyncStorage.setItem('fitness.profile.v1', '{"name":"old"}');
  (AsyncStorage.multiRemove as jest.Mock).mockRejectedValueOnce(new Error('interrupted'));
  await expect(finishLegacyUpgrade()).rejects.toThrow('interrupted');
  expect(await AsyncStorage.getItem('fitness.deviceId.v1')).toBe(legacy);
  await finishLegacyUpgrade();
  expect(await AsyncStorage.getItem(`${legacy}:fitness.profile.v1`)).toBe('{"name":"old"}');
});
it('unreadable legacy data is retained for recovery', async () => {
  await AsyncStorage.setItem('fitness.profile.v1', 'corrupt');
  await expect(finishLegacyUpgrade()).rejects.toThrow('unreadable');
  expect(await AsyncStorage.getItem('fitness.profile.v1')).toBe('corrupt');
});
it('failed server proof never moves local data', async () => {
  await saveSession({ ...session, user: { ...session.user, id: 'new-account' } });
  (api.post as jest.Mock).mockRejectedValueOnce(new Error('invalid code'));
  await expect(migrateLegacyAccount('code', 'password')).rejects.toThrow();
  expect(await AsyncStorage.getItem('fitness.deviceId.v1')).toBe(legacy);
});

it('conflicting local copies are retained rather than overwritten or discarded', async () => {
  await AsyncStorage.setItem('fitness.profile.v1', '{"name":"old"}');
  await AsyncStorage.setItem(`${legacy}:fitness.profile.v1`, '{"name":"newer"}');
  await expect(finishLegacyUpgrade()).rejects.toThrow('conflict');
  expect(await AsyncStorage.getItem('fitness.profile.v1')).toBe('{"name":"old"}');
  expect(await AsyncStorage.getItem(`${legacy}:fitness.profile.v1`)).toBe('{"name":"newer"}');
});

it('approved unimported legacy copies remain exportable and are deleted with their account', async () => {
  const { exportAccountCache, purgeAccountCache } = require('../../storage/accountStorage');
  await AsyncStorage.setItem('fitness.profile.v1', '{"name":"old"}');
  expect((await exportAccountCache(legacy))['legacy-unimported/fitness.profile.v1']).toEqual({ name: 'old' });
  await purgeAccountCache(legacy);
  expect(await AsyncStorage.getItem('fitness.profile.v1')).toBeNull();
  expect(await AsyncStorage.getItem('fitness.deviceId.v1')).toBeNull();
});
