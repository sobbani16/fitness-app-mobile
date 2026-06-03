import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/exercises';
import { nextSetWeight, validateSet } from '../services/exerciseAutofill';
import type {
  ExercisePrefill,
  ExerciseSession,
  ExerciseSet,
} from '../types/exercise';

export interface UseExerciseSession {
  // state
  exerciseType: string;
  session: ExerciseSession | null;
  prefill: ExercisePrefill | null;
  sets: ExerciseSet[];
  suggestedWeight: number | null;
  loading: boolean;
  saving: boolean;
  error: string | null;

  // actions
  setExerciseType: (t: string) => void;
  addSet: (reps: number, weight: number) => Promise<void>;
  reset: () => void;
}

/**
 * Encapsulates the lifecycle of a single exercise-logging flow:
 *  - fetches prefill (last-used weight) for the selected exerciseType
 *  - lazily creates a session on the first saved set
 *  - appends further sets, auto-filling weight per business rules
 */
export function useExerciseSession(initialExerciseType: string): UseExerciseSession {
  const [exerciseType, setExerciseTypeState] = useState(initialExerciseType);
  const [session, setSession] = useState<ExerciseSession | null>(null);
  const [prefill, setPrefill] = useState<ExercisePrefill | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard against race conditions when the user switches exercise quickly.
  const loadToken = useRef(0);

  const loadPrefill = useCallback(async (type: string) => {
    const token = ++loadToken.current;
    setLoading(true);
    setError(null);
    try {
      const pf = await api.getPrefill(type);
      if (token === loadToken.current) setPrefill(pf);
    } catch (e: any) {
      if (token === loadToken.current) {
        setPrefill(null);
        setError(e?.message || 'Could not load history');
      }
    } finally {
      if (token === loadToken.current) setLoading(false);
    }
  }, []);

  // Reload prefill + reset session whenever exercise changes.
  useEffect(() => {
    setSession(null);
    loadPrefill(exerciseType);
  }, [exerciseType, loadPrefill]);

  const setExerciseType = useCallback((t: string) => {
    setExerciseTypeState(t);
  }, []);

  const addSet = useCallback(
    async (reps: number, weight: number) => {
      const err = validateSet(reps, weight);
      if (err) {
        setError(err);
        return;
      }
      setSaving(true);
      setError(null);
      try {
        if (!session) {
          const created = await api.createSession(exerciseType, [{ reps, weight }]);
          setSession(created);
        } else {
          const updated = await api.appendSet(session.id, { reps, weight });
          setSession(updated);
        }
      } catch (e: any) {
        setError(e?.message || 'Could not save set');
      } finally {
        setSaving(false);
      }
    },
    [exerciseType, session],
  );

  const reset = useCallback(() => {
    setSession(null);
    setError(null);
    loadPrefill(exerciseType);
  }, [exerciseType, loadPrefill]);

  const sets = session?.sets ?? [];
  const suggestedWeight = nextSetWeight(sets, prefill);

  return {
    exerciseType,
    session,
    prefill,
    sets,
    suggestedWeight,
    loading,
    saving,
    error,
    setExerciseType,
    addSet,
    reset,
  };
}
