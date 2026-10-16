import { getSession } from './session';
export async function getDeviceId(): Promise<string> {
  const session = getSession();
  if (!session) throw new Error('Sign in required');
  return session.user.id;
}
