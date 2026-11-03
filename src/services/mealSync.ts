import { accountStorage as AsyncStorage } from '../storage/accountStorage';
import { api } from '../api/client';
import { accountKey, getSession } from '../storage/session';
import { LoggedMeal, todayKey } from '../storage/meals';
import { classifyFailure, FailureCategory } from './apiDiagnostics';

export interface MealSyncFailure { category: FailureCategory; status: number | null; message: string; at: string }
type Operation = { id: string; meal?: LoggedMeal; attempts?: number; failure?: MealSyncFailure };
export interface MealSyncIssue { id: string; name: string | null; message: string; status: number | null }
export class MealSyncError extends Error {
  constructor(message: string, readonly category: FailureCategory, readonly status: number | null) { super(message); this.name = 'MealSyncError'; }
}
let serial: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const next = serial.then(fn, fn);
  serial = next.catch(() => {});
  return next;
}
function assertAccount(userId: string | undefined) {
  if (!userId || getSession()?.user.id !== userId) throw new Error('Account changed. Sync paused.');
}
const readOps = async (key: string): Promise<Operation[]> => JSON.parse(await AsyncStorage.getItem(key) || '[]');
async function queueAt(key: string, meal: LoggedMeal | string) {
  const ops = await readOps(key);
  // A new edit replaces any earlier attempt, clearing its failure so it is retried.
  const op = typeof meal === 'string' ? { id: meal } : { id: meal.id, meal };
  await AsyncStorage.setItem(key, JSON.stringify([...ops.filter(x => x.id !== op.id), op]));
}
// Only a request-specific rejection is item-level. 404/403/401/5xx/network
// describe the service or session, so later items would fail the same way.
const itemLevel = (status: number | null) => status === 400 || status === 409 || status === 422;
function failureMessage(error: any, status: number | null): string {
  const server = error?.response?.data?.error;
  const detail = typeof server === 'string' ? server.slice(0, 160) : 'The server rejected this entry.';
  if (status === 409) return 'This entry conflicts with an existing record. Edit and save it again to retry.';
  return `${detail} Edit the meal and save it again to retry.`;
}
async function flushAt(key: string, userId: string | undefined) {
  let ops = await readOps(key);
  for (const op of [...ops]) {
    assertAccount(userId);
    if (op.failure && itemLevel(op.failure.status)) continue; // waits for the user's correction
    const m = op.meal;
    try {
      if (m) await api.post('/food-logs', {
        nutritionProfileId: m.nutritionSnapshot?.nutritionProfileId,
        catalogRevision: m.nutritionSnapshot?.revision, ingredientId: m.ingredientId, selectedServing: m.selectedServing,
        id: m.id, foodName: m.name, quantityG: m.quantityG || 0, calories: m.calories,
        proteinG: m.macros.protein_g, carbsG: m.macros.carbs_g, fatG: m.macros.fat_g,
        fiberG: m.macros.fiber_g ?? null, mealType: m.mealType || 'meal', loggedAt: m.createdAt,
      });
      else await api.delete(`/food-logs/${encodeURIComponent(op.id)}`);
      ops = ops.filter(x => x !== op);
      await AsyncStorage.setItem(key, JSON.stringify(ops));
    } catch (error: any) {
      assertAccount(userId);
      const status: number | null = error?.response?.status ?? null;
      const category = classifyFailure(error);
      const failure = { category, status, message: failureMessage(error, status), at: new Date().toISOString() };
      ops = ops.map(x => (x === op ? { ...x, attempts: (x.attempts || 0) + 1, failure } : x));
      await AsyncStorage.setItem(key, JSON.stringify(ops));
      if (!itemLevel(status)) throw new MealSyncError(error?.message || 'Meal sync failed', category, status);
    }
  }
  return ops.filter(op => op.failure && itemLevel(op.failure.status));
}
const toIssues = (ops: Operation[]): MealSyncIssue[] => ops.map(op => ({ id: op.id, name: op.meal?.name ?? null, message: op.failure!.message, status: op.failure!.status }));
/** Entries the server rejected; kept on the device until corrected. */
export async function getMealSyncIssues(): Promise<MealSyncIssue[]> {
  const ops = await readOps(accountKey('fitness.mealOutbox.v1'));
  return toIssues(ops.filter(op => op.failure && itemLevel(op.failure.status)));
}
/** Clears rejection markers so the next flush retries them as-is. */
export function retryRejectedMeals() {
  const key = accountKey('fitness.mealOutbox.v1'), userId = getSession()?.user.id;
  return locked(async () => {
    assertAccount(userId);
    const ops = await readOps(key);
    await AsyncStorage.setItem(key, JSON.stringify(ops.map(({ failure, ...op }) => op)));
    return toIssues(await flushAt(key, userId));
  });
}
export function queueMeal(meal: LoggedMeal | string) {
  const key = accountKey('fitness.mealOutbox.v1');
  return locked(() => queueAt(key, meal));
}
export function flushMeals() {
  const key = accountKey('fitness.mealOutbox.v1'), userId = getSession()?.user.id;
  return locked(async () => toIssues(await flushAt(key, userId)));
}

// Serialize local mutations with reconciliation so a network refresh cannot
// overwrite an addition or resurrect a deletion made while it was in flight.
export function saveMealChange(meal: LoggedMeal | string): Promise<LoggedMeal[]> {
  const date = typeof meal === 'string' ? new Date() : new Date(meal.createdAt);
  const cacheKey = todayKey(date), outboxKey = accountKey('fitness.mealOutbox.v1');
  const userId = getSession()?.user.id;
  return locked(async () => {
    assertAccount(userId);
    await queueAt(outboxKey, meal);
    const cached: LoggedMeal[] = JSON.parse(await AsyncStorage.getItem(cacheKey) || '[]');
    const id = typeof meal === 'string' ? meal : meal.id;
    const next = cached.filter(m => m.id !== id);
    if (typeof meal !== 'string') next.push(meal);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(next));
    return next;
  });
}

interface ServerMeal {
  ingredientId?: string; nutritionSnapshot?: Record<string, unknown>;
  id: string; loggedAt: string; foodName: string; calories: number;
  quantityG: number; proteinG: number; carbsG: number; fatG: number; fiberG: number | null;
  mealType: string;
}
export function reconcileMealDays(dates: Date[]): Promise<LoggedMeal[][]> {
  if (!dates.length || dates.length > 31 || dates.some(d => !Number.isFinite(d.getTime()))) {
    return Promise.reject(new Error('Choose between 1 and 31 valid history days.'));
  }
  const windows = dates.map(date => {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return { cacheKey: todayKey(date), start, end };
  });
  const outboxKey = accountKey('fitness.mealOutbox.v1');
  const userId = getSession()?.user.id;
  return locked(async () => {
    assertAccount(userId);
    await flushAt(outboxKey, userId);
    // Anything still in the outbox (e.g. rejected entries) stays as the user saved it.
    const pending = new Map((await readOps(outboxKey)).map(op => [op.id, op]));
    // The API uses UTC days; fetch every UTC day touched by this local day,
    // then filter by local bounds (including DST days).
    const utcDays = new Set<string>();
    for (const { start, end } of windows) {
      const cursor = new Date(start); cursor.setUTCHours(0, 0, 0, 0);
      while (cursor < end) {
        utcDays.add(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
    // Bound concurrency and fetch the entire window before replacing any cache.
    const days = [...utcDays];
    const responses: Array<{ data: { logs: ServerMeal[] } }> = [];
    for (let i = 0; i < days.length; i += 4) {
      assertAccount(userId);
      responses.push(...await Promise.all(days.slice(i, i + 4).map(day =>
        api.get<{ logs: ServerMeal[] }>('/food-logs', { params: { date: day } }))));
    }
    const results: LoggedMeal[][] = [];
    for (const { cacheKey, start, end } of windows) {
      assertAccount(userId);
      const cached: LoggedMeal[] = JSON.parse(await AsyncStorage.getItem(cacheKey) || '[]');
      const previous = new Map(cached.map(m => [m.id, m]));
      const records = new Map<string, LoggedMeal>();
      for (const { data } of responses) for (const row of data.logs) {
        const time = Date.parse(row.loggedAt);
        if (time < start.getTime() || time >= end.getTime() || !Number.isFinite(time)) continue;
        records.set(row.id, {
          ...previous.get(row.id), id: row.id, createdAt: row.loggedAt,
          ingredientId: row.ingredientId, nutritionSnapshot: row.nutritionSnapshot,
          name: row.foodName, calories: row.calories, quantityG: row.quantityG,
          macros: { protein_g: row.proteinG, carbs_g: row.carbsG, fat_g: row.fatG, ...(row.fiberG == null ? {} : { fiber_g: row.fiberG }) },
          mealType: ['breakfast', 'lunch', 'dinner', 'snack'].includes(row.mealType) ? row.mealType as LoggedMeal['mealType'] : undefined,
          feedback: previous.get(row.id)?.feedback || '', source: previous.get(row.id)?.source === 'legacy-local' ? 'synced' : previous.get(row.id)?.source || 'synced',
        });
      }
      // Retain device-only legacy rows until the owner explicitly edits or deletes them.
      for (const meal of cached) if (meal.source === 'legacy-local' && !records.has(meal.id)) records.set(meal.id, meal);
      for (const [id, op] of pending) {
        if (!op.meal) { records.delete(id); continue; }
        const local = cached.find(m => m.id === id);
        if (local) records.set(id, local);
      }
      const next = [...records.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      assertAccount(userId);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(next));
      results.push(next);
    }
    return results;
  });
}

export async function reconcileMealsFor(date = new Date()): Promise<LoggedMeal[]> {
  return (await reconcileMealDays([date]))[0];
}
