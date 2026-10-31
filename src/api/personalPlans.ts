import { api } from './client';
import { loadProgressPrefs, saveProgressPrefs } from '../storage/progressPrefs';

export interface PlanExercise { exerciseId: string; sets: number; reps: string; restSec: number; why?: string; startResistance?: string }
export interface PlanDay { weekday: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'; focus?: string; warmup?: string[]; cooldown?: string[]; exercises: PlanExercise[] }
export interface PersonalPlan {
  id: string; version: number; status: 'draft' | 'active' | 'archived';
  plan: { days: PlanDay[]; summary?: string };
  preferences?: Record<string, unknown>; createdAt: string; confirmedAt?: string;
}
export interface PlanPreferences {
  goal?: string; experience?: string; location?: string; equipment?: string[];
  preferredDays?: string[]; sessionMinutes?: number; intensity?: string;
  limitations?: string[]; likedExercises?: string[]; dislikedExercises?: string[];
}

const WD: Record<PlanDay['weekday'], number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

export function draftPlan(preferences: PlanPreferences) {
  return api.post('/personal-plans/draft', { preferences }).then(r => r.data as PersonalPlan & { warnings: string[] });
}
export function listPlans() {
  return api.get<{ plans: PersonalPlan[] }>('/personal-plans').then(r => r.data.plans);
}
export function updateDraft(id: string, plan: PersonalPlan['plan'], preferences?: PlanPreferences) {
  return api.put(`/personal-plans/${id}`, { plan, preferences }).then(r => r.data);
}
/** Confirm a draft → active on server, then sync weekdays into local
 *  progressPrefs so the existing reminder engine schedules on plan days. */
export async function confirmPlan(plan: PersonalPlan): Promise<void> {
  await api.post(`/personal-plans/${plan.id}/confirm`, {});
  const days = (plan.plan?.days || []).map(d => WD[d.weekday]).filter(d => d != null);
  const prefs = await loadProgressPrefs();
  await saveProgressPrefs({ ...prefs, workoutDays: days });
}
export interface CatalogExercise {
  id: string; name: string; pattern: string; muscle: string[]; equipment: string[];
  difficulty: string; position: string; alternatives: string[];
  suitability: { status: 'suitable' | 'adapt' | 'needs-info' | 'review'; reasons: string[]; alternatives: string[] };
}
export interface Suggestion { exerciseId: string; direction: 'increase' | 'maintain' | 'reduce'; reason: string; confidence: string }
export interface SuggestionResult { suggestions: Suggestion[]; missedNote?: string; note?: string }
export function getSuggestions(params?: { rir?: number; discomfort?: boolean; missed?: number; feedback?: string }) {
  return api.get('/personal-plans/suggestions', { params }).then(r => r.data as SuggestionResult);
}
export function listCatalog(prefs: PlanPreferences = {}) {
  const params: Record<string, string> = {};
  if (prefs.equipment) params.equipment = prefs.equipment.join(',');
  if (prefs.limitations?.length) params.limitations = prefs.limitations.join(',');
  if (prefs.experience) params.experience = prefs.experience;
  return api.get<{ exercises: CatalogExercise[] }>('/personal-plans/catalog', { params }).then(r => r.data.exercises);
}
