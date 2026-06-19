import { api } from './client';
import { getDeviceId } from '../storage/device';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrainerProfile {
  id: string;
  userId: string;
  bio: string | null;
  certifications: string[];
  specialties: string[];
  yearsExperience: number;
  tier: 'standard' | 'pro' | 'elite';
  location: string | null;
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
  bio?: string;
  certifications?: string[];
  specialties?: string[];
  yearsExperience?: number;
  tier?: 'standard' | 'pro' | 'elite';
  location?: string;
  profilePicture?: string;
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

export async function listTrainers(tier?: string): Promise<{ trainers: TrainerProfile[] }> {
  const userId = await getDeviceId();
  const params = tier ? { tier } : {};
  const res = await api.get<{ trainers: TrainerProfile[] }>('/trainers', {
    headers: { 'x-user-id': userId },
    params,
  });
  return res.data;
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
// User subscription
// ---------------------------------------------------------------------------

export async function subscribeToTrainer(trainerId: string): Promise<TrainerClient> {
  const userId = await getDeviceId();
  const res = await api.post<TrainerClient>(`/trainers/${trainerId}/subscribe`, {}, {
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
