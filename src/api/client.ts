import { resolveApiUrl } from '../config/apiUrl';
import axios from 'axios';
import { purgeAccountCache, UNSYNCED_KEYS } from '../storage/accountStorage';
import { getSession, saveSession } from '../storage/session';
import { clientBuild, CLIENT_API_CONTRACT } from '../config/buildInfo';
import { noteServerContract, recordFailure } from '../services/apiDiagnostics';
const correlationId = () => `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const baseURL = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL, __DEV__);
export const api = axios.create({ baseURL, timeout: 45000 });
api.interceptors.request.use(config => {
  const session = getSession();
  if (session) config.headers.set('Authorization', `Bearer ${session.token}`);
  config.headers.delete('x-user-id');
  config.headers.set('x-correlation-id', correlationId());
  config.headers.set('x-client-build', clientBuild());
  config.headers.set('x-client-contract', String(CLIENT_API_CONTRACT));
  (config as any).metadata = { startedAt: Date.now() };
  return config;
}, undefined, { synchronous: true });
api.interceptors.response.use(response => { noteServerContract(response.headers); return response; }, async error => {
  recordFailure(error, Number((error.config as any)?.metadata?.retry || 0));
  const sentToken = error.config?.headers?.get?.('Authorization');
  const current = getSession();
  if (error.response?.status === 401 && current && sentToken === `Bearer ${current.token}` && !error.config?.url?.startsWith('/auth/')) { await purgeAccountCache(current.user.id, UNSYNCED_KEYS); await saveSession(null); }
  if (error.response?.status === 403 && error.response?.data?.code === 'EMAIL_NOT_VERIFIED' && current && sentToken === `Bearer ${current.token}`) await saveSession({ ...current, user: { ...current.user, emailVerifiedAt: null } });
  return Promise.reject(error);
});
