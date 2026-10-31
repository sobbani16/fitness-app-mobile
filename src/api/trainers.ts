import { api } from './client';
import { getDeviceId } from '../storage/device';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrainerTier = 'standard' | 'pro' | 'elite';
export type CoachingMode = 'online' | 'in_person' | 'both';
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export interface TrainerProfile {
  id: string;
  userId: string;
  displayName: string | null;
  bio: string | null;
  philosophy: string | null;
  certifications: string[];
  specialties: string[];
  languages: string[];
  coachingMode: CoachingMode | null;
  yearsExperience: number;
  tier: TrainerTier;
  location: string | null;
  country: string | null;
  timeZone: string | null;
  website: string | null;
  applicationStatus?: ApplicationStatus;
  verified: boolean;
  active: boolean;
  rating: number | null;
  ratingCount: number;
  profilePicture: string | null;
  maxClients: number;
  currentClients: number;
  spotsLeft: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrainerClient {
  id: string;
  trainerId: string;
  clientId: string;
  status: string;
  assignedAt: string;
  startedAt: string;
  lockedUntil: string | null;
  daysWithTrainer: number;
  trainer?: TrainerProfile;
}

export interface DropFormReasons {
  trainerReasons: string[];
  clientReasons: string[];
}

export interface ClientProgress {
  period: string;
  rangeStart: string;
  rangeEnd: string;
  engagementStart: string;
  daysWithTrainer: number;
  weight: any[];
  macroScores: any[];
  workoutSessions: any[];
  healthScores: any[];
  steps: any[];
  sleep: any[];
}

export interface TrainerSignupPayload {
  displayName?: string;
  bio?: string;
  philosophy?: string;
  certifications?: string[];
  specialties?: string[];
  languages?: string[];
  coachingMode?: CoachingMode;
  yearsExperience?: number;
  tier?: TrainerTier;
  location?: string;
  country?: string;
  timeZone?: string;
  website?: string;
  profilePicture?: string;
}

// ---------------------------------------------------------------------------
// Trainer applications (registration draft → submit → review)
// ---------------------------------------------------------------------------

export interface TrainerApplication {
  id?: string;
  applicationStatus: ApplicationStatus;
  applicationNote?: string | null;
  displayName?: string | null;
  bio?: string | null;
  philosophy?: string | null;
  specialties?: string[];
  languages?: string[];
  coachingMode?: CoachingMode | null;
  certifications?: (TrainerCertification | string)[];
  yearsExperience?: number;
  tier?: TrainerTier;
  location?: string | null;
  country?: string | null;
  timeZone?: string | null;
  website?: string | null;
  profilePicture?: string | null;
}

export interface TrainerApplicationPayload {
  displayName?: string;
  bio?: string;
  philosophy?: string;
  specialties?: string[];
  languages?: string[];
  coachingMode?: CoachingMode;
  certifications?: TrainerCertificationInput[];
  yearsExperience?: number;
  tier?: TrainerTier;
  location?: string;
  country?: string;
  timeZone?: string;
  website?: string;
  profilePicture?: string;
}

// ---------------------------------------------------------------------------
// Certifications
// ---------------------------------------------------------------------------

export interface TrainerCertification {
  id: string;
  name: string;
  issuingOrganization?: string | null;
  credentialId?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  /** Set server-side; never sent by the client. */
  verificationStatus?: string;
}

export interface TrainerCertificationInput {
  name: string;
  issuingOrganization?: string;
  credentialId?: string;
  issuedAt?: string;
  expiresAt?: string;
}

export interface TrainerDropPayload {
  reasons: string[];
  notes?: string;
  candidateGoals?: string;
  adherenceRating?: number;
}

export interface ClientDropPayload {
  reasons: string[];
  notes?: string;
  trainerRating?: number;
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

export interface TrainerListParams {
  q?: string;
  specialty?: string;
  mode?: CoachingMode | string;
  language?: string;
  country?: string;
  tier?: TrainerTier | string;
  cursor?: string;
  take?: number;
}

export interface TrainerListResponse {
  trainers: TrainerProfile[];
  nextCursor: string | null;
}

export async function listTrainers(filters: TrainerListParams = {}): Promise<TrainerListResponse> {
  const userId = await getDeviceId();
  const params: Record<string, string | number> = {};
  if (filters.q) params.q = filters.q;
  if (filters.specialty) params.specialty = filters.specialty;
  if (filters.mode) params.mode = filters.mode;
  if (filters.language) params.language = filters.language;
  if (filters.country) params.country = filters.country;
  if (filters.tier) params.tier = filters.tier;
  if (filters.cursor) params.cursor = filters.cursor;
  if (filters.take) params.take = filters.take;
  const res = await api.get<TrainerListResponse>('/trainers', {
    headers: { 'x-user-id': userId },
    params,
  });
  return { trainers: res.data.trainers ?? [], nextCursor: res.data.nextCursor ?? null };
}

export async function getTrainerDetail(id: string): Promise<TrainerProfile> {
  const userId = await getDeviceId();
  const res = await api.get<TrainerProfile>(`/trainers/${id}`, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function getDropFormReasons(): Promise<DropFormReasons> {
  const res = await api.get<DropFormReasons>('/trainers/drop-reasons');
  return res.data;
}

// ---------------------------------------------------------------------------
// Trainer signup & profile
// ---------------------------------------------------------------------------

export async function signupAsTrainer(payload: TrainerSignupPayload): Promise<TrainerProfile> {
  const userId = await getDeviceId();
  const res = await api.post<TrainerProfile>('/trainers/signup', payload, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function updateTrainerProfile(payload: Partial<TrainerSignupPayload>): Promise<TrainerProfile> {
  const userId = await getDeviceId();
  const res = await api.patch<TrainerProfile>('/trainers/me/profile', payload, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

// ---------------------------------------------------------------------------
// Trainer application (draft → submit → review)
// ---------------------------------------------------------------------------

export async function createTrainerApplication(payload: TrainerApplicationPayload): Promise<TrainerApplication> {
  const userId = await getDeviceId();
  const res = await api.post<TrainerApplication>('/trainers/applications', payload, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function getMyApplication(): Promise<TrainerApplication | null> {
  const userId = await getDeviceId();
  try {
    const res = await api.get<TrainerApplication>('/trainers/applications/me', {
      headers: { 'x-user-id': userId },
    });
    return res.data ?? null;
  } catch (e: any) {
    if (e.response?.status === 404) return null;
    throw e;
  }
}

export async function updateMyApplication(payload: TrainerApplicationPayload): Promise<TrainerApplication> {
  const userId = await getDeviceId();
  const res = await api.patch<TrainerApplication>('/trainers/applications/me', payload, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function submitMyApplication(): Promise<TrainerApplication> {
  const userId = await getDeviceId();
  const res = await api.post<TrainerApplication>('/trainers/applications/me/submit', {}, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

// ---------------------------------------------------------------------------
// Certifications (trainer-owned records; verificationStatus is server-set)
// ---------------------------------------------------------------------------

export async function listMyCertifications(): Promise<TrainerCertification[]> {
  const userId = await getDeviceId();
  const res = await api.get<{ certifications: TrainerCertification[] } | TrainerCertification[]>(
    '/trainers/me/certifications', { headers: { 'x-user-id': userId } });
  const data = res.data as any;
  return Array.isArray(data) ? data : data?.certifications ?? [];
}

export async function addCertification(payload: TrainerCertificationInput): Promise<TrainerCertification> {
  const userId = await getDeviceId();
  const res = await api.post<TrainerCertification>('/trainers/me/certifications', payload, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function updateCertification(id: string, payload: Partial<TrainerCertificationInput>): Promise<TrainerCertification> {
  const userId = await getDeviceId();
  const res = await api.patch<TrainerCertification>(`/trainers/me/certifications/${id}`, payload, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function deleteCertification(id: string): Promise<void> {
  const userId = await getDeviceId();
  await api.delete(`/trainers/me/certifications/${id}`, {
    headers: { 'x-user-id': userId },
  });
}

// ---------------------------------------------------------------------------
// User subscription
// ---------------------------------------------------------------------------

export interface SubscribeResponse {
  /** 'pending' — subscribing now creates a request the trainer must accept. */
  status: string;
}

export async function subscribeToTrainer(trainerId: string): Promise<SubscribeResponse> {
  const userId = await getDeviceId();
  const res = await api.post<SubscribeResponse>(`/trainers/${trainerId}/subscribe`, {}, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function getAssignedTrainer(): Promise<{ assigned: (TrainerClient & { trainer: TrainerProfile }) | null }> {
  const userId = await getDeviceId();
  const res = await api.get<{ assigned: (TrainerClient & { trainer: TrainerProfile }) | null }>('/trainers/me/assigned', {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function dropTrainer(payload: ClientDropPayload): Promise<any> {
  const userId = await getDeviceId();
  const res = await api.post('/trainers/me/drop', payload, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

// ---------------------------------------------------------------------------
// Trainer — client management
// ---------------------------------------------------------------------------

export async function getMyClients(): Promise<{ clients: TrainerClient[] }> {
  const userId = await getDeviceId();
  const res = await api.get<{ clients: TrainerClient[] }>('/trainers/me/clients', {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function getClientProgress(
  clientId: string,
  period: 'daily' | 'weekly' | 'monthly' | '6months' = 'weekly',
  from?: string
): Promise<ClientProgress> {
  const userId = await getDeviceId();
  const params: Record<string, string> = { period };
  if (from) params.from = from;
  const res = await api.get<ClientProgress>(`/trainers/clients/${clientId}/progress`, {
    headers: { 'x-user-id': userId },
    params,
  });
  return res.data;
}

export async function dropClient(clientId: string, payload: TrainerDropPayload): Promise<any> {
  const userId = await getDeviceId();
  const res = await api.post(`/trainers/clients/${clientId}/drop`, payload, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}
