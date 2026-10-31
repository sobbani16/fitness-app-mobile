import { api } from './client';
import { getDeviceId } from '../storage/device';

// ---------------------------------------------------------------------------
// Trainer workout plans — trainer side mounted at /trainer/workout-plans,
// client side at /me/workout-plans. Lifecycle:
//   draft → publish → assign → client accept/decline → complete (+feedback)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanStatus = 'draft' | 'published' | 'archived';
export type PlanDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type PlanAssignmentStatus = 'assigned' | 'accepted' | 'declined' | 'completed' | 'archived';

export interface TrainerPlanExercise {
  id?: string;
  exerciseName: string;
  exerciseId?: string | null;
  sets: number;
  reps?: number | null;
  repsText?: string | null;
  targetWeight?: number | null;
  weightGuidance?: string | null;
  restSeconds?: number | null;
  tempo?: string | null;
  progression?: string | null;
  order?: number;
}

export interface TrainerPlanDay {
  id?: string;
  dayIndex: number;
  label?: string | null;
  warmup?: string | null;
  cooldown?: string | null;
  notes?: string | null;
  exercises: TrainerPlanExercise[];
}

export interface PlanTrainerRef {
  id: string;
  displayName: string | null;
  profilePicture: string | null;
}

export interface TrainerWorkoutPlan {
  id: string;
  trainerId: string;
  clientId: string | null;
  title: string;
  description: string | null;
  goal: string | null;
  difficulty: string | null;
  durationWeeks: number | null;
  daysPerWeek: number | null;
  startAt: string | null;
  endAt: string | null;
  status: string;
  version: number;
  supersedesId?: string | null;
  active?: boolean;
  createdAt: string;
  updatedAt: string;
  days?: TrainerPlanDay[];
  assignments?: WorkoutPlanAssignment[];
  trainer?: PlanTrainerRef;
  _count?: { days: number; assignments: number };
}

export interface WorkoutPlanFeedback {
  id: string;
  assignmentId: string;
  clientId: string;
  workoutSessionId: string | null;
  rating: number | null;
  note: string | null;
  createdAt: string;
}

export interface LinkedWorkoutSession {
  id: string;
  workoutType: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMinutes: number | null;
  caloriesBurned: number | null;
}

export interface WorkoutPlanAssignment {
  id: string;
  planId: string;
  clientId: string;
  status: string;
  assignedAt: string;
  respondedAt: string | null;
  plan?: TrainerWorkoutPlan;
  feedback?: WorkoutPlanFeedback[];
  sessions?: LinkedWorkoutSession[];
}

export interface WorkoutPlanPayload {
  title: string;
  description?: string | null;
  goal?: string | null;
  difficulty?: string | null;
  durationWeeks?: number | null;
  daysPerWeek?: number | null;
  startAt?: string | null;
  endAt?: string | null;
  days?: TrainerPlanDay[];
}

export interface PlanAssignmentProgress {
  id: string;
  clientId: string;
  status: string;
  assignedAt: string;
  respondedAt: string | null;
  plannedSessions: number | null;
  completedSessions: number;
  workoutRecordsConsent: boolean;
  sessions: LinkedWorkoutSession[];
}

export interface PlanProgress {
  planId: string;
  title: string;
  status: string;
  version: number;
  daysCount?: number;
  plannedSessions: number | null;
  assignments: PlanAssignmentProgress[];
}

// ---------------------------------------------------------------------------
// Trainer side
// ---------------------------------------------------------------------------

async function authHeaders() {
  const userId = await getDeviceId();
  return { 'x-user-id': userId };
}

export async function createWorkoutPlan(payload: WorkoutPlanPayload): Promise<TrainerWorkoutPlan> {
  const headers = await authHeaders();
  const res = await api.post<TrainerWorkoutPlan>('/trainer/workout-plans', payload, { headers });
  return res.data;
}

export async function updateWorkoutPlan(id: string, payload: Partial<WorkoutPlanPayload>): Promise<TrainerWorkoutPlan> {
  const headers = await authHeaders();
  const res = await api.patch<TrainerWorkoutPlan>(`/trainer/workout-plans/${encodeURIComponent(id)}`, payload, { headers });
  return res.data;
}

export async function publishWorkoutPlan(id: string): Promise<TrainerWorkoutPlan> {
  const headers = await authHeaders();
  const res = await api.post<TrainerWorkoutPlan>(`/trainer/workout-plans/${encodeURIComponent(id)}/publish`, {}, { headers });
  return res.data;
}

/** Clone a published plan into a version+1 draft (the old row is archived). */
export async function reviseWorkoutPlan(id: string): Promise<TrainerWorkoutPlan> {
  const headers = await authHeaders();
  const res = await api.post<TrainerWorkoutPlan>(`/trainer/workout-plans/${encodeURIComponent(id)}/revise`, {}, { headers });
  return res.data;
}

export async function assignWorkoutPlan(id: string, clientId: string): Promise<WorkoutPlanAssignment> {
  const headers = await authHeaders();
  const res = await api.post<WorkoutPlanAssignment>(`/trainer/workout-plans/${encodeURIComponent(id)}/assign`, { clientId }, { headers });
  return res.data;
}

export async function listWorkoutPlans(status?: PlanStatus): Promise<{ plans: TrainerWorkoutPlan[]; nextCursor: string | null }> {
  const headers = await authHeaders();
  const res = await api.get<{ plans: TrainerWorkoutPlan[]; nextCursor: string | null }>('/trainer/workout-plans', {
    headers,
    params: status ? { status } : {},
  });
  return res.data;
}

export async function getWorkoutPlan(id: string): Promise<TrainerWorkoutPlan> {
  const headers = await authHeaders();
  const res = await api.get<TrainerWorkoutPlan>(`/trainer/workout-plans/${encodeURIComponent(id)}`, { headers });
  return res.data;
}

export async function getWorkoutPlanProgress(id: string): Promise<PlanProgress> {
  const headers = await authHeaders();
  const res = await api.get<PlanProgress>(`/trainer/workout-plans/${encodeURIComponent(id)}/progress`, { headers });
  return res.data;
}

// ---------------------------------------------------------------------------
// Client side
// ---------------------------------------------------------------------------

export async function listMyWorkoutPlans(): Promise<{ assignments: WorkoutPlanAssignment[]; nextCursor: string | null }> {
  const headers = await authHeaders();
  const res = await api.get<{ assignments: WorkoutPlanAssignment[]; nextCursor: string | null }>('/me/workout-plans', { headers });
  return res.data;
}

export async function getMyWorkoutPlan(assignmentId: string): Promise<WorkoutPlanAssignment> {
  const headers = await authHeaders();
  const res = await api.get<WorkoutPlanAssignment>(`/me/workout-plans/${encodeURIComponent(assignmentId)}`, { headers });
  return res.data;
}

export async function respondToWorkoutPlan(assignmentId: string, action: 'accept' | 'decline'): Promise<WorkoutPlanAssignment> {
  const headers = await authHeaders();
  const res = await api.post<WorkoutPlanAssignment>(`/me/workout-plans/${encodeURIComponent(assignmentId)}/respond`, { action }, { headers });
  return res.data;
}

export async function sendWorkoutPlanFeedback(
  assignmentId: string,
  payload: { rating?: number; note?: string; workoutSessionId?: string },
): Promise<WorkoutPlanFeedback> {
  const headers = await authHeaders();
  const res = await api.post<WorkoutPlanFeedback>(`/me/workout-plans/${encodeURIComponent(assignmentId)}/feedback`, payload, { headers });
  return res.data;
}

export async function completeWorkoutPlan(assignmentId: string, workoutSessionId: string): Promise<WorkoutPlanAssignment> {
  const headers = await authHeaders();
  const res = await api.post<WorkoutPlanAssignment>(`/me/workout-plans/${encodeURIComponent(assignmentId)}/complete`, { workoutSessionId }, { headers });
  return res.data;
}
