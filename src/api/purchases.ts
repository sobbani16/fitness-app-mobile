import { api } from './client';
import { getDeviceId } from '../storage/device';

// ---------------------------------------------------------------------------
// Paid coaching commerce — client side mounted at /me (entitlements +
// purchases), trainer side at /trainer/commerce. Behind the
// trainer_paid_coaching_enabled flag (schema + mock provider only).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PackageKind = 'subscription' | 'one_time' | 'session_pack';
export type SubscriptionInterval = 'month' | 'year';

export interface CoachingPackage {
  id: string;
  trainerId: string;
  title: string;
  kind: string;
  sessionCount: number | null;
  interval: string | null;
  priceCents: number;
  currency: string;
  active: boolean;
}

export interface CoachingPackagePayload {
  title: string;
  kind: PackageKind;
  priceCents: number;
  currency?: string;
  sessionCount?: number;
  interval?: SubscriptionInterval;
}

export interface TrainerPurchase {
  id: string;
  clientId: string;
  packageId: string;
  provider: string;
  providerRef: string;
  status: string; // pending | paid | failed | refunded | canceled
  amountCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  package?: { title: string; kind: string; trainerId?: string };
}

export interface Entitlement {
  id: string;
  purchaseId: string | null;
  clientId: string;
  trainerId: string;
  kind: string; // subscription | session_pack | session
  remainingSessions: number | null;
  expiresAt: string | null;
  status: string; // active | exhausted | expired | revoked
  purchase?: { packageId: string; amountCents: number; currency: string } | null;
}

export interface CheckoutResult {
  purchase: TrainerPurchase;
  checkout: { reused: boolean; [key: string]: unknown };
}

// ---------------------------------------------------------------------------
// Client side
// ---------------------------------------------------------------------------

async function authHeaders() {
  const userId = await getDeviceId();
  return { 'x-user-id': userId };
}

export async function listEntitlements(): Promise<Entitlement[]> {
  const headers = await authHeaders();
  const res = await api.get<{ entitlements: Entitlement[] }>('/me/entitlements', { headers });
  return res.data.entitlements;
}

export async function checkoutPackage(packageId: string, idempotencyKey: string): Promise<CheckoutResult> {
  const headers = await authHeaders();
  const res = await api.post<CheckoutResult>('/me/purchases/checkout', { packageId, idempotencyKey }, { headers });
  return res.data;
}

export async function listMyPurchases(): Promise<TrainerPurchase[]> {
  const headers = await authHeaders();
  const res = await api.get<{ purchases: TrainerPurchase[] }>('/me/purchases', { headers });
  return res.data.purchases;
}

// ---------------------------------------------------------------------------
// Trainer side
// ---------------------------------------------------------------------------

export async function listTrainerPackages(activeOnly = false): Promise<CoachingPackage[]> {
  const headers = await authHeaders();
  const res = await api.get<{ packages: CoachingPackage[] }>('/trainer/commerce/packages', {
    headers,
    params: activeOnly ? { active: '1' } : {},
  });
  return res.data.packages;
}

export async function createTrainerPackage(payload: CoachingPackagePayload): Promise<CoachingPackage> {
  const headers = await authHeaders();
  const res = await api.post<CoachingPackage>('/trainer/commerce/packages', payload, { headers });
  return res.data;
}

export async function updateTrainerPackage(id: string, payload: Partial<Omit<CoachingPackagePayload, 'kind'>> & { active?: boolean; sessionCount?: number | null; interval?: string | null }): Promise<CoachingPackage> {
  const headers = await authHeaders();
  const res = await api.patch<CoachingPackage>(`/trainer/commerce/packages/${encodeURIComponent(id)}`, payload, { headers });
  return res.data;
}

/** Deactivate (soft-delete) a package — history is preserved server-side. */
export async function deactivateTrainerPackage(id: string): Promise<CoachingPackage> {
  const headers = await authHeaders();
  const res = await api.delete<CoachingPackage>(`/trainer/commerce/packages/${encodeURIComponent(id)}`, { headers });
  return res.data;
}

export async function listTrainerPurchases(): Promise<TrainerPurchase[]> {
  const headers = await authHeaders();
  const res = await api.get<{ purchases: TrainerPurchase[] }>('/trainer/commerce/purchases', { headers });
  return res.data.purchases;
}
