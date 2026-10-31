import { api } from './client';
import { getDeviceId } from '../storage/device';

export async function registerPushToken(token: string, platform: string): Promise<any> {
  const userId = await getDeviceId();
  const res = await api.post('/me/push-tokens', { token, platform }, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function unregisterPushToken(token: string): Promise<void> {
  const userId = await getDeviceId();
  await api.delete(`/me/push-tokens/${encodeURIComponent(token)}`, {
    headers: { 'x-user-id': userId },
  });
}
