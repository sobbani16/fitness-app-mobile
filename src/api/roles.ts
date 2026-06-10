import { api } from './client';
import { getDeviceId } from '../storage/device';

export interface UserRolesResponse {
  userId: string;
  roles: string[];
  permissions: string[];
}

export async function getMyRoles(): Promise<UserRolesResponse> {
  const userId = await getDeviceId();
  const res = await api.get<UserRolesResponse>('/me/roles', {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}
