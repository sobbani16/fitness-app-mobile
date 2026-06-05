import { api } from './client';

export interface Supplement {
  id: string;
  name: string;
  category?: string | null;
  defaultDose?: string | null;
  isDefault: boolean;
}

export interface AddSupplementInput {
  name: string;
  category?: string;
  defaultDose?: string;
}

// GET /supplements — the shared catalog (defaults first, then user-added).
export async function listSupplements(): Promise<Supplement[]> {
  const res = await api.get<{ supplements: Supplement[] }>('/supplements');
  return res.data.supplements ?? [];
}

// POST /supplements — add a new supplement to the catalog (idempotent by name).
export async function addSupplement(input: AddSupplementInput): Promise<Supplement> {
  const res = await api.post<Supplement>('/supplements', input);
  return res.data;
}
