import { resolveApiUrl } from '../config/apiUrl';
import axios from 'axios';
import { purgeAccountCache } from '../storage/accountStorage';
import { getSession, saveSession } from '../storage/session';
const baseURL = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL, __DEV__);
export const api = axios.create({ baseURL, timeout: 45000 });
api.interceptors.request.use(config => {
  const session = getSession();
  if (session) config.headers.set('Authorization', `Bearer ${session.token}`);
  config.headers.delete('x-user-id');
  return config;
}, undefined, { synchronous: true });
api.interceptors.response.use(response => response, async error => {
  const sentToken = error.config?.headers?.get?.('Authorization');
  const current = getSession();
  if (error.response?.status === 401 && current && sentToken === `Bearer ${current.token}` && !error.config?.url?.startsWith('/auth/')) { await purgeAccountCache(current.user.id); await saveSession(null); }
  if (error.response?.status === 403 && error.response?.data?.code === 'EMAIL_NOT_VERIFIED' && current && sentToken === `Bearer ${current.token}`) await saveSession({ ...current, user: { ...current.user, emailVerifiedAt: null } });
  return Promise.reject(error);
});
