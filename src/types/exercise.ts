export interface ExerciseSet {
  reps: number;
  weight: number;
  timestamp: string; // ISO
}

export interface ExerciseSession {
  id: string;
  userId: string;
  exerciseType: string;
  createdAt: string;
  updatedAt: string;
  sets: ExerciseSet[];
}

export interface ExercisePrefill {
  suggestedWeight: number | null;
  lastSessionAt: string | null;
  lastSetCount: number;
}

// Canonical list of exercises the picker can offer. Extend freely.
export const EXERCISE_TYPES = [
  'bench-press',
  'squat',
  'deadlift',
  'overhead-press',
  'barbell-row',
  'pull-up',
  'push-up',
] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];
