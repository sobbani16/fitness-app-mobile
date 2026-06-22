import { api } from './client';
import { getDeviceId } from '../storage/device';

// --- Types ---

export interface ExtractedNutrition {
  productName: string | null;
  ingredients: string | null;
  servingSizeG: number;
  servingsPerContainer: number | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  confidence: number;
}

export interface AdjustedNutrition {
  adjCalories: number;
  adjProteinG: number;
  adjCarbsG: number;
  adjFatG: number;
  adjFiberG: number;
  adjSugarG: number;
}

export interface ScannedLabelRecord {
  id: string;
  userId: string;
  productName: string | null;
  ingredients: string | null;
  servingSizeG: number;
  servingsPerContainer: number | null;
  labelCalories: number;
  labelProteinG: number;
  labelCarbsG: number;
  labelFatG: number;
  labelFiberG: number;
  labelSugarG: number;
  labelSodiumMg: number;
  actualPortionG: number;
  adjCalories: number;
  adjProteinG: number;
  adjCarbsG: number;
  adjFatG: number;
  adjFiberG: number;
  adjSugarG: number;
  foodLogId: string | null;
  photoUri: string | null;
  ocrRawText: string | null;
  aiConfidence: number | null;
  mealType: string | null;
  createdAt: string;
}

export interface SaveLabelInput {
  productName?: string;
  ingredients?: string;
  servingSizeG: number;
  servingsPerContainer?: number;
  labelCalories: number;
  labelProteinG: number;
  labelCarbsG: number;
  labelFatG: number;
  labelFiberG?: number;
  labelSugarG?: number;
  labelSodiumMg?: number;
  actualPortionG: number;
  mealType?: string;
  photoUri?: string;
  ocrRawText?: string;
  aiConfidence?: number;
}

export interface SaveLabelResponse {
  scannedLabel: ScannedLabelRecord;
  foodLog: {
    id: string;
    userId: string;
    foodName: string;
    quantityG: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    mealType: string;
  };
  adjusted: AdjustedNutrition;
}

// --- API Functions ---

/** Extract nutrition facts from OCR text using backend AI/regex */
export async function extractFromOcrText(ocrText: string): Promise<ExtractedNutrition> {
  const res = await api.post<{ extracted: ExtractedNutrition }>('/label-scanner/extract', { ocrText });
  return res.data.extracted;
}

/** Calculate portion-adjusted nutrition (stateless) */
export async function adjustPortion(
  servingSizeG: number,
  actualPortionG: number,
  nutrition: { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG?: number; sugarG?: number },
): Promise<AdjustedNutrition> {
  const res = await api.post<{ adjusted: AdjustedNutrition }>('/label-scanner/adjust', {
    servingSizeG,
    actualPortionG,
    ...nutrition,
  });
  return res.data.adjusted;
}

/** Save scanned label + create food log entry */
export async function saveLabelAndLog(input: SaveLabelInput): Promise<SaveLabelResponse> {
  const userId = await getDeviceId();
  const res = await api.post<SaveLabelResponse>('/label-scanner/save', input, {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}

/** Get user's scanned label history */
export async function getLabelHistory(limit: number = 20): Promise<ScannedLabelRecord[]> {
  const userId = await getDeviceId();
  const res = await api.get<{ labels: ScannedLabelRecord[] }>('/label-scanner/history', {
    params: { limit },
    headers: { 'x-user-id': userId },
  });
  return res.data.labels;
}
