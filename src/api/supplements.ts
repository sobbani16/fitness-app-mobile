import { api } from './client';
import { getDeviceId } from '../storage/device';

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
  // Only present on user-selected supplements:
  userSupplementId?: string;
  lastTakenAt?: string | null;
}

export interface AddSupplementInput {
  name: string;
  category?: string;
  brand?: string;
  flavor?: string;
  defaultDose?: string;
  servingSizeG?: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
}

// GET /supplements — the shared catalog (defaults first, then user-added).
export async function listSupplements(): Promise<Supplement[]> {
  const res = await api.get<{ supplements: Supplement[] }>('/supplements');
  return res.data.supplements ?? [];
}

// GET /supplements/search?q=... — search the global catalog.
export async function searchSupplements(q: string): Promise<Supplement[]> {
  const res = await api.get<{ results: Supplement[] }>('/supplements/search', {
    params: { q },
  });
  return res.data.results ?? [];
}

// GET /supplements/mine — the user's selected supplements.
export async function getMySupplements(): Promise<Supplement[]> {
  const userId = await getDeviceId();
  const res = await api.get<{ supplements: Supplement[] }>('/supplements/mine', {
    headers: { 'x-user-id': userId },
  });
  return res.data.supplements ?? [];
}

// POST /supplements/mine — add a supplement to the user's list.
export async function selectSupplement(supplementId: string): Promise<Supplement> {
  const userId = await getDeviceId();
  const res = await api.post<Supplement>(
    '/supplements/mine',
    { supplementId },
    { headers: { 'x-user-id': userId } },
  );
  return res.data;
}

// DELETE /supplements/mine/:id — remove from user's list.
export async function deselectSupplement(supplementId: string): Promise<void> {
  const userId = await getDeviceId();
  await api.delete(`/supplements/mine/${supplementId}`, {
    headers: { 'x-user-id': userId },
  });
}

// POST /supplements — add a new supplement to the global catalog.
export async function addSupplement(input: AddSupplementInput): Promise<Supplement> {
  const res = await api.post<Supplement>('/supplements', input);
  return res.data;
}
