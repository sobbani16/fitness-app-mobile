import { api } from './client';
import { getDeviceId } from '../storage/device';
import type {
  ExercisePrefill,
  ExerciseSession,
  ExerciseSet,
} from '../types/exercise';

async function authHeaders() {
  const userId = await getDeviceId();
  return { 'x-user-id': userId };
}

export async function listSessions(): Promise<ExerciseSession[]> {
  const headers = await authHeaders();
  const res = await api.get<{ sessions: ExerciseSession[] }>('/exercises', { headers });
  return res.data.sessions;
}

export async function getPrefill(exerciseType: string): Promise<ExercisePrefill> {
  const headers = await authHeaders();
  const res = await api.get<ExercisePrefill>(
    `/exercises/prefill/${encodeURIComponent(exerciseType)}`,
    { headers },
  );
  return res.data;
}

export async function createSession(
  exerciseType: string,
  sets: Pick<ExerciseSet, 'reps' | 'weight' | 'id'>[],
  id?: string,
  startedAt?: string,
): Promise<ExerciseSession> {
  const headers = await authHeaders();
  const res = await api.post<ExerciseSession>(
    '/exercises',
    { exerciseType, sets, id, startedAt },
    { headers },
  );
  return res.data;
}

export async function appendSet(
  sessionId: string,
  set: Pick<ExerciseSet, 'reps' | 'weight' | 'id'>,
): Promise<ExerciseSession> {
  const headers = await authHeaders();
  const res = await api.post<ExerciseSession>(
    `/exercises/${encodeURIComponent(sessionId)}/sets`,
    set,
    { headers },
  );
  return res.data;
}

export async function finishSession(id: string): Promise<ExerciseSession> {
  const headers = await authHeaders();
  return (await api.post<ExerciseSession>(`/exercises/${encodeURIComponent(id)}/finish`, {}, { headers })).data;
}
