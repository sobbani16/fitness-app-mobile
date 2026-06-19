import { api } from './client';
import { getDeviceId } from '../storage/device';

export interface RecipeIngredient {
  id: string;
  ingredientName: string;
  amountG: number;
}

export interface Recipe {
  id: string;
  recipeName: string;
  mealType: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  portionG: number;
  ingredients: RecipeIngredient[];
}

export interface WeeklyMeal {
  id: string;
  dayOfWeek: number;
  mealType: string;
  foodName: string;
  portionG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  prepNote?: string;
  recipeId?: string;
  recipe?: Recipe;
  confirmedByUser: boolean;
  lockedAt?: string;
}

export interface ShoppingItem {
  id: string;
  foodName: string;
  quantityG: number;
  quantityDisplay: string;
  category?: string;
  inInventory: boolean;
  checked: boolean;
  checkedAt?: string;
}

export interface WeeklyPlan {
  id: string;
  userId: string;
  weekStartDate: string;
  status: string;
  caloriesTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  fiberTarget: number;
  explanation?: string;
  meals: WeeklyMeal[];
  shoppingList?: { items: ShoppingItem[] };
}

export interface GeneratePlanPayload {
  weekStartDate: string;
  caloriesTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  fiberTarget: number;
  explanation?: string;
}

async function withUserId<T>(fn: (userId: string) => Promise<T>): Promise<T> {
  const userId = await getDeviceId();
  return fn(userId);
}

export async function getCurrentPlan(): Promise<WeeklyPlan | null> {
  return withUserId(async (userId) => {
    try {
      const res = await api.get('/weekly-plan/current', { headers: { 'x-user-id': userId } });
      return res.data as WeeklyPlan;
    } catch (e: any) {
      if (e.response?.status === 404) return null;
      throw e;
    }
  });
}

export async function generatePlan(payload: GeneratePlanPayload): Promise<WeeklyPlan> {
  return withUserId(async (userId) => {
    const res = await api.post('/weekly-plan/generate', payload, { headers: { 'x-user-id': userId } });
    return res.data as WeeklyPlan;
  });
}

export async function getMealAlternatives(mealId: string): Promise<Recipe[]> {
  return withUserId(async (userId) => {
    const res = await api.get(`/weekly-plan/meals/${mealId}/alternatives`, { headers: { 'x-user-id': userId } });
    return res.data.alternatives as Recipe[];
  });
}

export async function swapMeal(mealId: string, recipeId: string): Promise<WeeklyMeal> {
  return withUserId(async (userId) => {
    const res = await api.post(`/weekly-plan/meals/${mealId}/swap`, { recipeId }, { headers: { 'x-user-id': userId } });
    return res.data.meal as WeeklyMeal;
  });
}

export async function confirmDay(planId: string, dayOfWeek: number): Promise<{ confirmed: boolean; allConfirmed: boolean }> {
  return withUserId(async (userId) => {
    const res = await api.post(`/weekly-plan/days/${dayOfWeek}/confirm`, { planId }, { headers: { 'x-user-id': userId } });
    return res.data as { confirmed: boolean; allConfirmed: boolean };
  });
}

export async function unconfirmDay(planId: string, dayOfWeek: number): Promise<{ confirmed: boolean; allConfirmed: boolean }> {
  return withUserId(async (userId) => {
    const res = await api.post(`/weekly-plan/days/${dayOfWeek}/unconfirm`, { planId }, { headers: { 'x-user-id': userId } });
    return res.data as { confirmed: boolean; allConfirmed: boolean };
  });
}

export async function canEditDay(planId: string, dayOfWeek: number): Promise<{ userCanEdit: boolean; trainerCanEdit: boolean; assignedTrainerId: string | null }> {
  return withUserId(async (userId) => {
    const res = await api.get(`/weekly-plan/days/${dayOfWeek}/edit-state`, { params: { planId }, headers: { 'x-user-id': userId } });
    return res.data as { userCanEdit: boolean; trainerCanEdit: boolean; assignedTrainerId: string | null };
  });
}

export async function generateShoppingList(planId: string): Promise<{ itemsCount: number }> {
  return withUserId(async (userId) => {
    const res = await api.post('/weekly-plan/shopping-list/generate', { planId }, { headers: { 'x-user-id': userId } });
    return res.data as { itemsCount: number };
  });
}

export async function getShoppingList(planId: string): Promise<{ items: ShoppingItem[] }> {
  return withUserId(async (userId) => {
    const res = await api.get('/weekly-plan/shopping-list', { params: { planId }, headers: { 'x-user-id': userId } });
    return res.data as { items: ShoppingItem[] };
  });
}

export async function toggleShoppingItem(itemId: string, checked: boolean): Promise<ShoppingItem> {
  return withUserId(async (userId) => {
    const res = await api.patch(`/weekly-plan/shopping-list/items/${itemId}/check`, { checked }, { headers: { 'x-user-id': userId } });
    return res.data.item as ShoppingItem;
  });
}
