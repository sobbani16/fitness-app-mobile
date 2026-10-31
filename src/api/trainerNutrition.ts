import { api } from './client';
import { getDeviceId } from '../storage/device';

// ---------------------------------------------------------------------------
// Trainer nutrition guidance — trainer side mounted at /trainer/nutrition-plans,
// client side at /me/nutrition-plans. Responses embed `disclaimer` — surface it.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NutritionTargets {
  caloriesKcal?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
  waterMl?: number | null;
}

export interface NutritionTotals {
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
  [key: string]: number | null | undefined;
}

export interface NutritionPlanItem {
  id?: string;
  mealId?: string;
  ingredientId?: string | null;
  recipeId?: string | null;
  foodName?: string | null;
  quantityG: number;
  substitutions?: unknown;
  /** Populated by the server when nutrition was computed (detail/preview). */
  name?: string;
  resolvable?: boolean;
  nutrition?: NutritionTotals;
}

export interface NutritionPlanMeal {
  id?: string;
  planId?: string;
  mealType: string;
  timing?: string | null;
  notes?: string | null;
  items: NutritionPlanItem[];
  totals?: NutritionTotals;
  complete?: boolean;
  partialTotals?: NutritionTotals;
}

export interface TrainerNutritionPlan {
  id: string;
  trainerId: string;
  clientId: string | null;
  title: string;
  guidanceText: string | null;
  status: string;
  version: number;
  supersedesId?: string | null;
  createdAt: string;
  updatedAt: string;
  meals?: NutritionPlanMeal[];
  targets?: NutritionTargets | null;
  assignments?: NutritionAssignment[];
  totals?: NutritionTotals;
  partialTotals?: NutritionTotals;
  complete?: boolean;
  disclaimer?: string;
  _count?: { meals: number; assignments: number };
}

export interface NutritionFeedback {
  id: string;
  assignmentId: string;
  clientId: string;
  rating: number | null;
  note: string | null;
  createdAt: string;
}

export interface NutritionAssignment {
  id: string;
  planId: string;
  clientId: string;
  status: string;
  assignedAt: string;
  respondedAt: string | null;
  plan?: TrainerNutritionPlan;
  feedback?: NutritionFeedback[];
  disclaimer?: string;
  allergyConflicts?: AllergyConflict[];
}

export interface AllergyConflict {
  itemId: string;
  mealId: string;
  mealType: string;
  item: string;
  allergen: string;
  match: string;
}

export interface NutritionPreview {
  planId: string;
  version: number;
  status: string;
  disclaimer: string;
  meals: NutritionPlanMeal[];
  totals: NutritionTotals;
  partialTotals?: NutritionTotals;
  complete: boolean;
  targets: NutritionTargets | null;
  allergyCheckConsent: boolean;
  allergyConflicts: AllergyConflict[];
}

export interface NutritionPlanPayload {
  title: string;
  guidanceText?: string | null;
  clientId?: string | null;
  meals?: { mealType: string; timing?: string | null; notes?: string | null; items: NutritionPlanItem[] }[];
  targets?: NutritionTargets | null;
}

export interface NutritionAssignResult {
  assignment: NutritionAssignment;
  disclaimer: string;
  allergyCheckConsent: boolean;
  allergyConflicts: AllergyConflict[];
}

export interface MealLogOverride {
  itemId: string;
  quantityG?: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
}

// ---------------------------------------------------------------------------
// Trainer side
// ---------------------------------------------------------------------------

async function authHeaders() {
  const userId = await getDeviceId();
  return { 'x-user-id': userId };
}

export async function createNutritionPlan(payload: NutritionPlanPayload): Promise<TrainerNutritionPlan> {
  const headers = await authHeaders();
  const res = await api.post<TrainerNutritionPlan>('/trainer/nutrition-plans', payload, { headers });
  return res.data;
}

export async function updateNutritionPlan(id: string, payload: Partial<NutritionPlanPayload>): Promise<TrainerNutritionPlan> {
  const headers = await authHeaders();
  const res = await api.patch<TrainerNutritionPlan>(`/trainer/nutrition-plans/${encodeURIComponent(id)}`, payload, { headers });
  return res.data;
}

export async function publishNutritionPlan(id: string): Promise<TrainerNutritionPlan> {
  const headers = await authHeaders();
  const res = await api.post<TrainerNutritionPlan>(`/trainer/nutrition-plans/${encodeURIComponent(id)}/publish`, {}, { headers });
  return res.data;
}

export async function reviseNutritionPlan(id: string, payload?: Partial<NutritionPlanPayload>): Promise<TrainerNutritionPlan> {
  const headers = await authHeaders();
  const res = await api.post<TrainerNutritionPlan>(`/trainer/nutrition-plans/${encodeURIComponent(id)}/revise`, payload || {}, { headers });
  return res.data;
}

export async function archiveNutritionPlan(id: string): Promise<TrainerNutritionPlan> {
  const headers = await authHeaders();
  const res = await api.post<TrainerNutritionPlan>(`/trainer/nutrition-plans/${encodeURIComponent(id)}/archive`, {}, { headers });
  return res.data;
}

export async function assignNutritionPlan(id: string, clientId: string): Promise<NutritionAssignResult> {
  const headers = await authHeaders();
  const res = await api.post<NutritionAssignResult>(`/trainer/nutrition-plans/${encodeURIComponent(id)}/assign`, { clientId }, { headers });
  return res.data;
}

export async function listNutritionPlans(status?: 'draft' | 'published' | 'archived'): Promise<{ plans: TrainerNutritionPlan[]; disclaimer: string }> {
  const headers = await authHeaders();
  const res = await api.get<{ plans: TrainerNutritionPlan[]; disclaimer: string }>('/trainer/nutrition-plans', {
    headers,
    params: status ? { status } : {},
  });
  return res.data;
}

export async function getNutritionPlan(id: string): Promise<TrainerNutritionPlan> {
  const headers = await authHeaders();
  const res = await api.get<TrainerNutritionPlan>(`/trainer/nutrition-plans/${encodeURIComponent(id)}`, { headers });
  return res.data;
}

export async function previewNutritionPlan(id: string): Promise<NutritionPreview> {
  const headers = await authHeaders();
  const res = await api.get<NutritionPreview>(`/trainer/nutrition-plans/${encodeURIComponent(id)}/preview`, { headers });
  return res.data;
}

// ---------------------------------------------------------------------------
// Client side
// ---------------------------------------------------------------------------

export async function listMyNutritionPlans(): Promise<{ assignments: NutritionAssignment[]; disclaimer: string }> {
  const headers = await authHeaders();
  const res = await api.get<{ assignments: NutritionAssignment[]; disclaimer: string }>('/me/nutrition-plans', { headers });
  return res.data;
}

export async function getMyNutritionPlan(assignmentId: string): Promise<NutritionAssignment> {
  const headers = await authHeaders();
  const res = await api.get<NutritionAssignment>(`/me/nutrition-plans/${encodeURIComponent(assignmentId)}`, { headers });
  return res.data;
}

export async function respondToNutritionPlan(assignmentId: string, action: 'accept' | 'decline'): Promise<{ assignment: NutritionAssignment; disclaimer: string }> {
  const headers = await authHeaders();
  const res = await api.post<{ assignment: NutritionAssignment; disclaimer: string }>(`/me/nutrition-plans/${encodeURIComponent(assignmentId)}/respond`, { action }, { headers });
  return res.data;
}

export async function sendNutritionFeedback(
  assignmentId: string,
  payload: { rating?: number; note?: string },
): Promise<{ feedback: NutritionFeedback; disclaimer: string }> {
  const headers = await authHeaders();
  const res = await api.post<{ feedback: NutritionFeedback; disclaimer: string }>(`/me/nutrition-plans/${encodeURIComponent(assignmentId)}/feedback`, payload, { headers });
  return res.data;
}

export async function logNutritionMeal(
  assignmentId: string,
  payload: { mealId: string; loggedAt?: string; items?: MealLogOverride[] },
): Promise<{ logs: unknown[]; disclaimer: string }> {
  const headers = await authHeaders();
  const res = await api.post<{ logs: unknown[]; disclaimer: string }>(`/me/nutrition-plans/${encodeURIComponent(assignmentId)}/log`, payload, { headers });
  return res.data;
}
