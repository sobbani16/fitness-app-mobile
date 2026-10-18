import { trackEvent } from '../analytics/events';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/exercises';
import { validateSet } from '../services/exerciseAutofill';
import { accountStorage } from '../storage/accountStorage';
import { accountKey, getSession } from '../storage/session';
import type { ExerciseSession, ExerciseSet } from '../types/exercise';

type Pending = { id: string; reps: number; weight: number };
export interface WorkoutDraft {
  id: string; exerciseType: string; startedAt: string; session: ExerciseSession | null;
  pending?: Pending; finishing?: boolean;
}
const newId = () => `workout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
/** Persist each operation before sending it; replay the same IDs after an uncertain response. */
export function useExerciseSession() {
  const account = useRef(getSession()?.user.id).current;
  const key = useRef(accountKey('fitness.workoutDraft.v1')).current;
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const current = useRef<WorkoutDraft | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const check = useCallback(() => {
    if (!mounted.current || !account || getSession()?.user.id !== account) throw new Error('Account changed');
  }, [account]);
  const persist = useCallback(async (value: WorkoutDraft | null) => {
    check();
    await accountStorage.setItem(key, JSON.stringify(value));
    check(); current.current = value; setDraft(value);
  }, [check, key]);
  useEffect(() => {
    mounted.current = true;
    accountStorage.getItem(key).then(raw => {
      check(); const value = raw ? JSON.parse(raw) : null;
      current.current = value; setDraft(value); setReady(true);
    }).catch(() => { if (mounted.current) setError('Could not restore your workout. Reopen Workout before starting another.'); })
      .finally(() => { if (mounted.current) setLoading(false); });
    return () => { mounted.current = false; };
  }, [check, key]);
  const run = useCallback(async (action: () => Promise<void>) => {
    if (busy.current) return false;
    busy.current = true; setSaving(true); setError(null);
    try { check(); await action(); return true; }
    catch (e: any) { if (mounted.current) setError(e?.response?.data?.error || e?.message || 'Could not save. Retry when connected.'); return false; }
    finally { busy.current = false; if (mounted.current) setSaving(false); }
  }, [check]);
  const start = (exerciseType: string) => run(async () => {
    if (current.current) throw new Error('Finish the current workout first');
    await persist({ id: newId(), exerciseType, startedAt: new Date().toISOString(), session: null });
    trackEvent('workout_started');
  });
  const sendPending = async (d: WorkoutDraft) => {
    if (!d.pending) return;
    check();
    const session = d.session
      ? await api.appendSet(d.session.id, d.pending)
      : await api.createSession(d.exerciseType, [d.pending], d.id, d.startedAt);
    check(); await persist({ ...d, session, pending: undefined });
  };
  const addSet = (reps: number, weight: number) => run(async () => {
    const d = current.current;
    if (!d || d.session?.finishedAt || d.finishing) throw new Error('Start a workout before logging');
    if (d.pending) { await sendPending(d); return; }
    const invalid = validateSet(reps, weight); if (invalid) throw new Error(invalid);
    const next = { ...d, pending: { id: newId(), reps, weight } };
    await persist(next); await sendPending(next);
  });
  const finish = () => run(async () => {
    const d = current.current;
    if (!d?.session || d.pending) throw new Error('Save pending sets before finishing');
    const next = { ...d, finishing: true };
    await persist(next); check();
    const session = await api.finishSession(d.session.id);
    check(); await persist({ ...d, session, finishing: false });
    if (!d.session.finishedAt) trackEvent('workout_completed');
  });
  const clear = () => run(async () => {
    const d = current.current;
    if (d?.pending || d?.finishing || (d?.session && !d.session.finishedAt)) throw new Error('Finish your workout first');
    await persist(null);
  });
  const sets: ExerciseSet[] = draft?.session?.sets || [];
  return { draft, sets, ready, loading, saving, error, start, addSet, finish, clear };
}
