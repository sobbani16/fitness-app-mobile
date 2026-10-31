import { api } from './client';
import { getDeviceId } from '../storage/device';

// ---------------------------------------------------------------------------
// Coaching requests (subscribe creates a pending request; trainer accepts or
// declines). GET /trainer-requests scopes by `mine=1` (client's outgoing) vs
// no param (trainer's incoming).
// ---------------------------------------------------------------------------

export interface TrainerRequestParty {
  id?: string;
  displayName?: string | null;
  profilePicture?: string | null;
}

export interface TrainerRequest {
  id: string;
  status: string;
  /** ISO timestamp; `requestedAgo` may also be provided pre-formatted. */
  createdAt?: string;
  requestedAt?: string;
  requestedAgo?: string;
  clientId?: string;
  trainerId?: string;
  client?: TrainerRequestParty | null;
  trainer?: TrainerRequestParty | null;
  /** Flat fallbacks some responses use instead of nested parties. */
  clientName?: string | null;
  trainerName?: string | null;
  clientAvatar?: string | null;
  trainerAvatar?: string | null;
}

function unwrapRequests(data: any): TrainerRequest[] {
  if (Array.isArray(data)) return data;
  return data?.requests ?? data?.trainerRequests ?? [];
}

export async function getMyRequests(): Promise<TrainerRequest[]> {
  const userId = await getDeviceId();
  const res = await api.get('/trainer-requests', {
    headers: { 'x-user-id': userId },
    params: { mine: 1 },
  });
  return unwrapRequests(res.data);
}

export async function getIncomingRequests(): Promise<TrainerRequest[]> {
  const userId = await getDeviceId();
  const res = await api.get('/trainer-requests', {
    headers: { 'x-user-id': userId },
  });
  return unwrapRequests(res.data);
}

export async function acceptTrainerRequest(id: string): Promise<any> {
  const userId = await getDeviceId();
  const res = await api.post(`/trainer-requests/${id}/accept`, {}, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function declineTrainerRequest(id: string): Promise<any> {
  const userId = await getDeviceId();
  const res = await api.post(`/trainer-requests/${id}/decline`, {}, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function inviteClient(clientId: string): Promise<any> {
  const userId = await getDeviceId();
  const res = await api.post('/trainer-requests/invite', { clientId }, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

// ---------------------------------------------------------------------------
// Relationship consents + termination
// ---------------------------------------------------------------------------

export const CONSENT_CATEGORIES = [
  'workout_records',
  'food_logs',
  'nutrition_summaries',
  'weight_trends',
  'sleep_summaries',
  'step_counts',
  'body_measurements',
  'health_scores',
] as const;

export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

export interface RelationshipConsent {
  category: ConsentCategory | string;
  status: 'granted' | 'revoked' | string;
}

export async function getRelationshipConsents(relationId: string): Promise<RelationshipConsent[]> {
  const userId = await getDeviceId();
  const res = await api.get(`/trainer-relationships/${relationId}/consents`, {
    headers: { 'x-user-id': userId },
  });
  const data = res.data as any;
  return Array.isArray(data) ? data : data?.consents ?? [];
}

export async function updateRelationshipConsents(
  relationId: string,
  changes: { grants: ConsentCategory[]; revokes: ConsentCategory[] }
): Promise<any> {
  const userId = await getDeviceId();
  const res = await api.put(`/trainer-relationships/${relationId}/consents`, changes, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

export async function endRelationship(relationId: string): Promise<any> {
  const userId = await getDeviceId();
  const res = await api.post(`/trainer-relationships/${relationId}/end`, {}, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}
