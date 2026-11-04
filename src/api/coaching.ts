import { api } from './client';

// ---- Baseline intake (M12) -------------------------------------------------
export type IntakeStatus = 'in_progress' | 'submitted' | 'reviewed';
export type BaselineAssessment = {
  id: string;
  relationId: string;
  version: number;
  status: IntakeStatus;
  data: Record<string, unknown>;
  progress: { completed: number; total: number; missing: string[] };
  submittedAt: string | null;
  reviewedAt: string | null;
};

export async function getIntake(relationId: string): Promise<BaselineAssessment> {
  return (await api.get(`/coaching/intake/${relationId}`)).data;
}
export async function saveIntakeSections(relationId: string, sections: Record<string, unknown>): Promise<{ assessment: BaselineAssessment; created: boolean }> {
  return (await api.put(`/coaching/intake/${relationId}`, { sections })).data;
}
export async function submitIntake(relationId: string): Promise<{ assessment: BaselineAssessment; alreadySubmitted?: boolean }> {
  return (await api.post(`/coaching/intake/${relationId}/submit`)).data;
}

// ---- Shared outcome plans (M13) ---------------------------------------------
export type OutcomeGoal = {
  id: string; kind: string; title: string; baseline: string | null; target: string | null;
  targetDate: string | null; reviewIntervalDays: number; progressSource: string;
  notes: string | null; status: 'open' | 'met' | 'dropped'; sortOrder: number;
};
export type OutcomePlan = {
  id: string; relationId: string; version: number; status: string; title: string | null;
  targetDate: string | null; goals: OutcomeGoal[];
  adjustments?: { id: string; summary: string; createdAt: string }[];
};
export async function getActivePlan(relationId: string): Promise<{ plan: OutcomePlan | null; note?: string }> {
  return (await api.get(`/coaching/outcome-plans/relation/${relationId}`)).data;
}
export async function getMyPlans(): Promise<{ plans: OutcomePlan[] }> {
  return (await api.get('/coaching/outcome-plans/mine')).data;
}

// ---- Partnership preference (M17) --------------------------------------------
export type CoachingPreference = {
  userId: string; model: 'self_guided' | 'humai_assisted' | 'trainer_led' | 'hybrid';
  planPrecedence: 'trainer_first' | 'humai_first';
  shareInsightsWithTrainer: boolean;
};
export async function getCoachingPreference(): Promise<CoachingPreference> {
  return (await api.get('/coaching/preference')).data;
}
export async function putCoachingPreference(pref: Partial<CoachingPreference>): Promise<CoachingPreference> {
  return (await api.put('/coaching/preference', pref)).data;
}
