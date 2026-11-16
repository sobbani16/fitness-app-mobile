import { api } from './client';

// ---- Food Intelligence ------------------------------------------------------
export type BarcodeProduct = { barcode: string; name: string; brand: string | null; servingSizeG: number | null; servingLabel: string | null; nutrients: Record<string, number>; ingredients: string | null; allergens: string[]; source: string };
export type BarcodeResult = { found: boolean; barcode: string; product?: BarcodeProduct; verified?: boolean; nextStep?: string };
export type EvidenceClaim = { claim: string; verdict: 'established' | 'mixed' | 'insufficient' | 'marketing'; applicability: string; studyType: string; dose: string; limitations: string; source: string };
export type IngredientEvidence = { found: boolean; ingredientKey: string; displayName?: string; summary?: string; claims?: EvidenceClaim[]; cautions?: { text: string; appliesTo: string }[]; attribution?: string };
export type Suitability = { verdict: 'suitable' | 'caution' | 'conflict' | 'unknown'; reasons: { type: string; severity: 'hard' | 'soft'; message: string }[]; unknowns: string[] };
export type ScanResult = { product: BarcodeProduct | null; nutrition: { source: string; verified: boolean; values: Record<string, number> } | null; evidence: IngredientEvidence[]; suitability: Suitability; provenance: Record<string, string>; disclaimer: string };

export const resolveBarcode = (code: string) => api.get(`/food-intel/barcode/${encodeURIComponent(code)}`).then((r) => r.data as Promise<BarcodeResult>);
export const getEvidence = (key: string) => api.get(`/food-intel/evidence/${encodeURIComponent(key)}`).then((r) => r.data as Promise<IngredientEvidence>);
export const listEvidence = () => api.get('/food-intel/evidence').then((r) => r.data.ingredients as Promise<{ ingredientKey: string; displayName: string; summary: string }[]>);
export const checkSuitability = (body: { ingredientKeys?: string[]; allergens?: string[]; ingredientText?: string }) => api.post('/food-intel/suitability', body).then((r) => r.data as Promise<Suitability>);
export const scanResult = (body: { barcode?: string; ingredientKeys?: string[]; ingredientText?: string; nutrients?: Record<string, number>; allergens?: string[] }) => api.post('/food-intel/scan-result', body).then((r) => r.data as Promise<ScanResult>);
