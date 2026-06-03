import { useCallback, useEffect, useRef, useState } from 'react';
import * as det from '../detection/detectionService';
import type { DetectionEvent, DetectionStatus } from '../detection/types';
import type { PostureAssessment } from '../detection/posture';

export interface UseExerciseDetection {
  status: DetectionStatus;
  isMock: boolean;
  reps: number;                  // latest reported rep count
  suggestedWeightKg: number | null;
  posture: PostureAssessment | null;
  lastEvent: DetectionEvent | null;
  error: string | null;
  start: (exerciseType: string) => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
}

/**
 * Subscribes to the active DetectionEngine and exposes rolled-up state.
 *
 * Keeps the UI layer free of detection-engine details — components just
 * read `reps` and `suggestedWeightKg` and decide what to do with them.
 */
export function useExerciseDetection(): UseExerciseDetection {
  const [status, setStatus] = useState<DetectionStatus>('idle');
  const [reps, setReps] = useState(0);
  const [suggestedWeightKg, setSuggestedWeightKg] = useState<number | null>(null);
  const [posture, setPosture] = useState<PostureAssessment | null>(null);
  const [lastEvent, setLastEvent] = useState<DetectionEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
      det.stopDetection().catch(() => {});
    };
  }, []);

  const handleEvent = useCallback((e: DetectionEvent) => {
    setLastEvent(e);
    if (e.type === 'rep') setReps(e.totalReps);
    else if (e.type === 'weight-estimate') setSuggestedWeightKg(e.grams / 1000);
    else if (e.type === 'posture') setPosture(e.assessment);
  }, []);

  const start = useCallback(
    async (exerciseType: string) => {
      setError(null);
      setReps(0);
      setSuggestedWeightKg(null);
      setPosture(null);
      try {
        setStatus('loading');
        await det.initDetection();
        await det.startDetection(exerciseType);
        if (unsubRef.current) unsubRef.current();
        unsubRef.current = det.subscribeDetection(handleEvent);
        setStatus('running');
      } catch (e: any) {
        setError(e?.message || 'Could not start detection');
        setStatus('error');
      }
    },
    [handleEvent],
  );

  const stop = useCallback(async () => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    await det.stopDetection().catch(() => {});
    setStatus('stopped');
  }, []);

  const reset = useCallback(() => {
    setReps(0);
    setSuggestedWeightKg(null);
    setPosture(null);
    setLastEvent(null);
    setError(null);
    setStatus('idle');
  }, []);

  return {
    status,
    isMock: !det.isUsingRealDetection(),
    reps,
    suggestedWeightKg,
    posture,
    lastEvent,
    error,
    start,
    stop,
    reset,
  };
}
