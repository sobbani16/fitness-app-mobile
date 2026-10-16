jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
const mockWrite = jest.fn(), mockDelete = jest.fn(), mockShare = jest.fn(), mockCreate = jest.fn();
jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///cache/' } },
  Directory: jest.fn().mockImplementation(() => ({ exists: true, delete: mockDelete, create: mockCreate })),
  File: jest.fn().mockImplementation(() => ({ uri: 'file:///cache/fitness-account.json', write: mockWrite })),
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn().mockResolvedValue(true), shareAsync: (...args: any[]) => mockShare(...args) }));
jest.mock('../../api/client', () => ({ api: { post: jest.fn() } }));
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../api/client';
import { saveSession, getSession } from '../../storage/session';
import { accountStorage } from '../../storage/accountStorage';
import { removeAccount, shareAccountExport, resumeAccountCleanup } from '../accountLifecycle';
const session = { token: 'a-token', expiresAt: '2099-01-01', user: { id: 'a', email: 'a@example.test' } };
beforeEach(async () => { await AsyncStorage.clear(); await saveSession(session); jest.clearAllMocks(); });
it('exports only this account local records and removes temporary export after sharing', async () => {
  await AsyncStorage.setItem('a:fitness.mealOutbox.v1', '[{"id":"unsynced"}]');
  await AsyncStorage.setItem('b:private', 'other account');
  (api.post as jest.Mock).mockResolvedValue({ data: { data: { profile: { id: 'a' } } } });
  await shareAccountExport('password');
  expect(mockWrite.mock.calls[0][0]).toContain('unsynced');
  expect(mockWrite.mock.calls[0][0]).not.toContain('other account');
  expect(mockShare).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ mimeType: 'application/json', UTI: 'public.json' }));
  expect(mockDelete).toHaveBeenCalledTimes(2);
});
it('cleans up the temporary file when native sharing fails', async () => {
  (api.post as jest.Mock).mockResolvedValue({ data: {} }); mockShare.mockRejectedValueOnce(new Error('Sharing cancelled'));
  await expect(shareAccountExport('password')).rejects.toThrow(); expect(mockDelete).toHaveBeenCalledTimes(2);
});
it('successful deletion clears only owned caches, signs out and suppresses late writes', async () => {
  await AsyncStorage.setItem('a:profile', 'health'); await AsyncStorage.setItem('b:profile', 'keep');
  (api.post as jest.Mock).mockResolvedValue({ data: { deleted: true } });
  await removeAccount('password', 'DELETE');
  await accountStorage.setItem('a:profile', 'late write');
  expect(await AsyncStorage.getItem('a:profile')).toBeNull(); expect(await AsyncStorage.getItem('b:profile')).toBe('keep'); expect(getSession()).toBeNull();
});
it('failed server deletion keeps credentials and local data', async () => {
  await AsyncStorage.setItem('a:profile', 'health'); (api.post as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await expect(removeAccount('password', 'DELETE')).rejects.toThrow('offline');
  expect(await AsyncStorage.getItem('a:profile')).toBe('health'); expect(getSession()?.token).toBe(session.token);
});
it('pending cleanup resumes after restart and does not sign out another account', async () => {
  await AsyncStorage.setItem('fitness.pendingAccountCleanup.v1', 'a'); await AsyncStorage.setItem('a:profile', 'health');
  await saveSession({ ...session, token: 'b-token', user: { id: 'b', email: 'b@example.test' } });
  await resumeAccountCleanup(); expect(await AsyncStorage.getItem('a:profile')).toBeNull(); expect(getSession()?.user.id).toBe('b');
});
it('export response arriving after an account switch is not shared', async () => {
  (api.post as jest.Mock).mockImplementationOnce(async () => { await saveSession(null); return { data: {} }; });
  await expect(shareAccountExport('password')).rejects.toThrow('Account changed'); expect(mockShare).not.toHaveBeenCalled();
});

it('keeps a durable cleanup task when cache removal fails after server deletion', async () => {
  await AsyncStorage.setItem('a:profile', 'health');
  (api.post as jest.Mock).mockResolvedValueOnce({ data: { deleted: true } });
  (AsyncStorage.multiRemove as jest.Mock).mockRejectedValueOnce(new Error('storage failure'));
  await expect(removeAccount('password', 'DELETE')).rejects.toThrow('server account was deleted');
  expect(await AsyncStorage.getItem('fitness.pendingAccountCleanup.v1')).toBe('a');
  await resumeAccountCleanup();
  expect(await AsyncStorage.getItem('a:profile')).toBeNull();
  expect(getSession()).toBeNull();
});
