import { api } from './client';

export interface Supplement {
  id: string;
  name: string;
  category?: string | null;
  brand?: string | null;
  flavor?: string | null;
  defaultDose?: string | null;
  servingSizeG?: number | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  isDefault: boolean;
  // v2 catalog fields:
  catalogStatus?: 'published' | 'candidate' | 'review_only' | 'personal' | 'archived';
  reviewStatus?: string;
  research?: boolean;
  unverified?: boolean;
  ingredient?: { slug?: string; productionCode?: string | null; evidenceClass?: string | null; researchStatus?: string } | null;
  // Only present on user-selected supplements:
  userSupplementId?: string;
  lastTakenAt?: string | null;
  doseAmount?: number | null;
  doseUnit?: string | null;
  notes?: string | null;
  personalLabel?: { name?: string; brand?: string | null; servingText?: string | null } | null;
  schedules?: SupplementSchedule[];
}

export interface SupplementEducation {
  overview?: string | null;
  whatItIs?: string | null;
  physiologicalRole?: string | null;
  isEssentialNutrient?: boolean | null;
  bodyProduces?: string | null;
  productionExplanation?: string | null;
  dietarySufficiency?: string | null;
  foodSources?: string | null;
  benefitEvidence?: string | null;
  evidenceLimitations?: string | null;
  timingCode?: string | null;
  timingSuggestion?: string | null;
  timingRationale?: string | null;
  timingStrength?: string | null;
  adverseEffects?: string | null;
  interactionCautions?: string | null;
  pregnancyCaution?: string | null;
  regulatoryNotes?: string | null;
  evidenceClass?: string | null;
  evidenceMeaning?: string | null;
  reviewStatus?: string;
  sources?: { title?: string | null; url: string; scope?: string | null; itemSpecific?: boolean }[];
}

export interface TimingGuidance {
  timingCode: string;
  category: string;
  suggestion: string;
  required: 'optional' | 'required' | 'uncertain';
  confidence: string;
  scheduleRelation: string;
  autoScheduleAllowed: boolean;
  needsClarification: boolean;
  labelExceptions?: string | null;
  rationale?: string | null;
  userConfirmationRequired: boolean;
}

export interface SupplementDetail {
  supplement: Supplement;
  education: SupplementEducation | null;
  guidance: TimingGuidance;
  labels: { research: boolean; reviewOnly: boolean; unverified: boolean; evidenceReviewed: boolean };
  disclaimer: string;
}

export interface SupplementSchedule {
  id: string;
  userSupplementId?: string | null;
  supplementId: string;
  dose?: string | null;
  doseAmount?: number | null;
  doseUnit?: string | null;
  frequency: 'daily' | 'specific_days' | 'weekly' | 'as_needed' | 'custom';
  daysOfWeek?: number[] | null;
  timingRelation: string;
  mealAnchor?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
  workoutAnchor?: boolean;
  reminderTime?: string | null;
  fallbackTime?: string | null;
  timezonePolicy?: 'FOLLOW_DEVICE' | 'FIXED_TIMEZONE';
  startDate?: string | null;
  endDate?: string | null;
  active: boolean;
  notifyEnabled: boolean;
  soundEnabled: boolean;
  snoozeMinutes: number;
  instructions?: string | null;
}

export interface DoseOccurrence {
  id: string;
  userSupplementId: string;
  scheduleId?: string | null;
  localDate: string;
  localTime?: string | null;
  timezone?: string | null;
  scheduledFor?: string | null;
  status: 'PENDING' | 'TAKEN' | 'SKIPPED' | 'MISSED' | 'SNOOZED' | 'CANCELLED';
  doseAmount?: number | null;
  doseUnit?: string | null;
  userSupplement?: { supplement: Supplement };
  schedule?: SupplementSchedule | null;
}

export interface SupplementLog {
  id: string;
  userSupplementId: string;
  supplementName: string;
  quantity: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  date: string;
}

export interface ScheduleInput {
  doseAmount?: number;
  doseUnit?: string;
  dose?: string;
  frequency?: string;
  daysOfWeek?: number[];
  timingRelation?: string;
  mealAnchor?: string;
  workoutAnchor?: boolean;
  reminderTime?: string;
  fallbackTime?: string;
  timezonePolicy?: string;
  startDate?: string;
  endDate?: string;
  notifyEnabled?: boolean;
  soundEnabled?: boolean;
  snoozeMinutes?: number;
  instructions?: string;
  active?: boolean;
}

export interface SafetyReport {
  disclaimers: string[];
  personalizedChecksPossible: boolean;
  warnings: { kind: string; severity: string; supplement?: string; message: string }[];
  infos: { kind: string; message: string }[];
  exposure: { duplicates: { family: string; supplements: string[]; note?: string | null }[]; cannotVerify: unknown[] };
}

// --- Catalog ---------------------------------------------------------------

export async function listSupplements(): Promise<Supplement[]> {
  const res = await api.get<{ supplements: Supplement[] }>('/supplements');
  return res.data.supplements ?? [];
}

export async function searchSupplements(q: string): Promise<Supplement[]> {
  const res = await api.get<{ results: Supplement[] }>('/supplements/search', { params: { q } });
  return res.data.results ?? [];
}

export async function getSupplementDetail(supplementId: string): Promise<SupplementDetail> {
  const res = await api.get<SupplementDetail>(`/supplements/detail/${supplementId}`);
  return res.data;
}

// --- User selections --------------------------------------------------------

export async function getMySupplements(): Promise<Supplement[]> {
  const res = await api.get<{ supplements: Supplement[] }>('/supplements/mine');
  return res.data.supplements ?? [];
}

export async function selectSupplement(supplementId: string): Promise<Supplement> {
  const res = await api.post<Supplement>('/supplements/mine', { supplementId });
  return res.data;
}

export async function deselectSupplement(supplementId: string): Promise<void> {
  await api.delete(`/supplements/mine/${supplementId}`);
}

export async function updateUserSupplement(userSupplementId: string, patch: { doseAmount?: number | null; doseUnit?: string | null; notes?: string | null }) {
  const res = await api.patch(`/supplements/mine/${userSupplementId}`, patch);
  return res.data.userSupplement;
}

export async function createPersonalSupplement(input: { name: string; brand?: string; flavor?: string; servingText?: string; doseAmount?: number; doseUnit?: string; notes?: string }): Promise<Supplement> {
  const res = await api.post<Supplement>('/supplements/personal', input);
  return res.data;
}

// --- Schedules ---------------------------------------------------------------

export async function getSchedules(userSupplementId: string): Promise<SupplementSchedule[]> {
  const res = await api.get<{ schedules: SupplementSchedule[] }>(`/supplements/mine/${userSupplementId}/schedules`);
  return res.data.schedules ?? [];
}

export async function createSchedule(userSupplementId: string, input: ScheduleInput): Promise<SupplementSchedule> {
  const res = await api.post<{ schedule: SupplementSchedule }>(`/supplements/mine/${userSupplementId}/schedules`, input);
  return res.data.schedule;
}

export async function updateSchedule(scheduleId: string, input: ScheduleInput): Promise<SupplementSchedule> {
  const res = await api.put<{ schedule: SupplementSchedule }>(`/supplements/schedules/${scheduleId}`, input);
  return res.data.schedule;
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  await api.delete(`/supplements/schedules/${scheduleId}`);
}

// --- Doses -------------------------------------------------------------------

export async function getTodayDoses(date?: string): Promise<{ date: string; occurrences: DoseOccurrence[] }> {
  const res = await api.get<{ date: string; occurrences: DoseOccurrence[] }>('/supplements/doses/today', { params: date ? { date } : {} });
  return res.data;
}

export async function getUpcomingDoses(days = 14): Promise<DoseOccurrence[]> {
  const res = await api.get<{ occurrences: DoseOccurrence[] }>('/supplements/doses/upcoming', { params: { days } });
  return res.data.occurrences ?? [];
}

export type DoseAction = 'taken' | 'skipped' | 'snoozed' | 'pending' | 'cancelled';

export async function doseAction(occurrenceId: string, action: DoseAction, payload: { minutes?: number; quantity?: number; amount?: number; unit?: string; idempotencyKey?: string; source?: string } = {}) {
  const res = await api.post(`/supplements/doses/${occurrenceId}/action`, { action, ...payload });
  return res.data;
}

// --- History, safety, logs ---------------------------------------------------

export async function getSupplementHistory(days = 30) {
  const res = await api.get<{ occurrences: DoseOccurrence[]; adherence: { week: unknown; month: unknown } }>('/supplements/history', { params: { days } });
  return res.data;
}

export async function getSupplementSafety(): Promise<SafetyReport> {
  const res = await api.get<SafetyReport>('/supplements/safety');
  return res.data;
}

export async function logSupplement(userSupplementId: string, quantity = 1, date?: string): Promise<SupplementLog> {
  const res = await api.post<SupplementLog>('/supplements/log', { userSupplementId, quantity, date });
  return res.data;
}

export async function deleteSupplementLog(logId: string): Promise<void> {
  await api.delete(`/supplements/log/${logId}`);
}

export async function getSupplementLogs(date?: string): Promise<SupplementLog[]> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const res = await api.get<{ logs: SupplementLog[] }>('/supplements/log', { params });
  return res.data.logs ?? [];
}
