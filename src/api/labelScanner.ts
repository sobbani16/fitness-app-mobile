import { api } from './client';
import { getDeviceId } from '../storage/device';

// --- Types ---

export interface ExtractedNutrition {
  saturatedFatG?: number | null;
  transFatG?: number | null;
  addedSugarG?: number | null;
  allergens?: string | null;
  productName: string | null;
  ingredients: string | null;
  servingSizeG: number | null;
  servingsPerContainer: number | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  confidence: number;
}

export interface AdjustedNutrition {
  adjCalories: number;
  adjProteinG: number;
  adjCarbsG: number;
  adjFatG: number;
  adjFiberG: number | null;
  adjSugarG: number | null;
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
  labelFiberG: number | null;
  labelSugarG: number | null;
  labelSodiumMg: number | null;
  actualPortionG: number;
  adjCalories: number;
  adjProteinG: number;
  adjCarbsG: number;
  adjFatG: number;
  adjFiberG: number | null;
  adjSugarG: number | null;
  foodLogId: string | null;
  photoUri: string | null;
  ocrRawText: string | null;
  aiConfidence: number | null;
  mealType: string | null;
  createdAt: string;
}

export interface SaveLabelInput {
  labelFacts?: LabelFacts;
  id?: string;
  productName?: string;
  ingredients?: string;
  servingSizeG: number;
  servingsPerContainer?: number;
  labelCalories: number;
  labelProteinG: number;
  labelCarbsG: number;
  labelFatG: number;
  labelFiberG?: number | null;
  labelSugarG?: number | null;
  labelSodiumMg?: number | null;
  actualPortionG: number;
  mealType?: string;
  photoUri?: string;
  ocrRawText?: string;
  aiConfidence?: number;
  extraction?: Record<string, unknown>;
  userCorrections?: Record<string, unknown>;
}

export interface SaveLabelResponse {
  scannedLabel: ScannedLabelRecord;
  foodLog: {
    loggedAt?: string;
    id: string;
    userId: string;
    foodName: string;
    quantityG: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number | null;
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

export interface LabelFacts {
  fatG?: number | null; saturatedFatG?: number | null; transFatG?: number | null;
  basisMassG?: number | null; servingsPerContainer?: number | null;
  ingredients: string; allergens: string; claims: string;
  calories: number | null; proteinG: number | null; form: 'solid' | 'liquid' | 'unknown';
  sugarG: number | null; addedSugarG: number | null; carbsG: number | null; fiberG: number | null; sodiumMg: number | null;
  basisAmount: number | null; basisUnit: 'g' | 'ml' | 'unknown'; column: 'serving' | '100' | 'unknown';
  portionRatio: number | null; jurisdiction: 'US' | 'IN' | 'unknown'; reviewed: boolean; personalize: boolean;
}
export interface LabelInsight {
  ruleId: string; ruleVersion: string; category: string; finding: string;
  evidence: { type: string; field: string; text: string; origin: string }[];
  explanation: string; recommendation: string; personalRelevance: string | null;
  source: { title: string; url: string }; confidence: string; confidenceExplanation: string;
}
export interface LabelAnalysis { version: string; facts: LabelFacts; insights: LabelInsight[]; limitations: string[]; foodIntelligence?: import('../components/FoodIntelligence').FoodIntelligenceResult }
export async function analyzeLabel(facts: LabelFacts): Promise<LabelAnalysis> {
  return (await api.post<LabelAnalysis>('/label-scanner/insights', facts)).data;
}

export async function compareLabels(first: LabelFacts, second: LabelFacts): Promise<LabelAnalysis> {
  return (await api.post<LabelAnalysis>('/label-scanner/compare', { first, second })).data;
}

export type DocumentType = 'NUTRITION_LABEL' | 'INGREDIENT_LIST' | 'FOOD_PACKAGING' | 'RESTAURANT_MENU' | 'UNSUPPORTED' | 'UNCERTAIN';
export interface Classification { type: DocumentType; confidence: number; guess?: DocumentType }
export async function classifyDocument(ocrText: string, hint?: 'menu'): Promise<Classification> {
  return (await api.post<Classification>('/label-scanner/classify', { ocrText, hint })).data;
}

export interface MenuItem {
  name: string; description: string | null; price: number | null; currency: string | null;
  calories: number | null; calorieSource: string | null; section: string | null; priceAmbiguous?: boolean; userCorrected?: boolean;
  nutritionSource: 'restaurant-reported' | 'estimated' | 'insufficient_information';
  estimate: { calories: { min: number; max: number; portionGMin: number; portionGMax: number }; proteinG: { min: number; max: number }; carbsG: { min: number; max: number }; fatG: { min: number; max: number } } | null;
  matchedTo?: { kind: string; name: string }; explanation: string;
}
export interface MergeEntry { value: any; source: string; confidence: number; evidence: string | null }
export interface MergedLabel {
  merged: ExtractedNutrition & { brand?: string; barcode?: string; claims?: string; column?: string; jurisdiction?: string };
  provenance: Record<string, MergeEntry[]>;
  conflicts: { field: string; kept: MergeEntry; rejected: MergeEntry }[];
  productConflict: boolean;
  productNames: string[];
  panelCount: number;
}
export async function extractMergedLabel(panels: Record<string, string | string[] | undefined>): Promise<MergedLabel> {
  const userId = await getDeviceId();
  return (await api.post<MergedLabel>('/label-scanner/extract-merged', { panels }, { headers: { 'x-user-id': userId } })).data;
}

export interface MenuResult { restaurant: string | null; items: MenuItem[] }
export async function scanMenu(pages: string[], restaurantName?: string): Promise<MenuResult> {
  const userId = await getDeviceId();
  return (await api.post<MenuResult>('/label-scanner/menu', { pages, restaurantName }, { headers: { 'x-user-id': userId } })).data;
}
