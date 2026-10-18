import { api } from '../api/client';
import { accountKey, getSession } from '../storage/session';
import { accountStorage } from '../storage/accountStorage';
import { loadMealsFor } from '../storage/meals';
export interface ProgressDay {
  date: string; mealCount: number; calories: number | null; protein: number | null; carbs: number | null;
  fat: number | null; fiber: number | null; weightKg: number | null; waterMl: number | null; steps: number | null; workouts: number | null;
}
export type Metric = 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'weightKg' | 'waterMl' | 'steps' | 'workouts';
export const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function dateWindow(count: number, ending = new Date()) {
  return Array.from({ length: count }, (_, i) => { const d = new Date(ending); d.setDate(d.getDate() - count + 1 + i); return localDate(d); });
}
export function mean(entries: ProgressDay[], metric: Metric) {
  const values = entries.map(d => d[metric]).filter((v): v is number => v !== null && Number.isFinite(v));
  return { value: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null, count: values.length };
}
export function chartPoints(entries: ProgressDay[], metric: Metric) {
  const size = Math.max(1, Math.ceil(entries.length / 10));
  const points = [];
  for (let i = 0; i < entries.length; i += size) {
    const group = entries.slice(i, i + size), average = mean(group, metric);
    points.push({ label: `${group[0].date}${group.length > 1 ? ` – ${group.at(-1)!.date}` : ''} (${average.count}/${group.length} days)`, value: average.value === null ? null : Math.round(average.value * 10) / 10 });
  }
  return points;
}
export async function cachedProgress(dates: string[], timeZone: string): Promise<ProgressDay[]> {
  const account = getSession()?.user.id;
  const raw = await accountStorage.getItem(accountKey(`fitness.progress.v1.${timeZone}`));
  const saved: ProgressDay[] = raw ? JSON.parse(raw).entries || [] : [];
  const map = new Map(saved.map(day => [day.date, day]));
  const days = await Promise.all(dates.map(async date => {
    if (map.has(date)) return map.get(date)!;
    const meals = await loadMealsFor(new Date(`${date}T12:00:00`));
    const sum = (key: 'protein_g' | 'carbs_g' | 'fat_g' | 'fiber_g') => meals.length && meals.every(m => Number.isFinite(m.macros?.[key])) ? meals.reduce((s, m) => s + m.macros[key]!, 0) : null;
    return { date, mealCount: meals.length, calories: meals.length ? meals.reduce((s, m) => s + m.calories, 0) : null, protein: sum('protein_g'), carbs: sum('carbs_g'), fat: sum('fat_g'), fiber: sum('fiber_g'), weightKg: null, waterMl: null, steps: null, workouts: null };
  }));
  if (getSession()?.user.id !== account) throw new Error('Account changed');
  return days;
}
const inFlight = new Map<string, Promise<ProgressDay[]>>();
export function fetchProgress(dates: string[], timeZone: string): Promise<ProgressDay[]> {
  const account = getSession()?.user.id;
  if (!account) return Promise.reject(new Error('Sign in required'));
  const requestKey = JSON.stringify([account, dates[0], dates.at(-1), timeZone]);
  const existing = inFlight.get(requestKey);
  if (existing) return existing;
  const pending = retrieveProgress(dates, timeZone).finally(() => { if (inFlight.get(requestKey) === pending) inFlight.delete(requestKey); });
  inFlight.set(requestKey, pending);
  return pending;
}
async function retrieveProgress(dates: string[], timeZone: string): Promise<ProgressDay[]> {
  const account = getSession()?.user.id, key = accountKey(`fitness.progress.v1.${timeZone}`);
  const { data } = await api.get<{ entries: ProgressDay[] }>('/me/progress', { params: { from: dates[0], to: dates.at(-1), timeZone } });
  if (!account || getSession()?.user.id !== account) throw new Error('Account changed');
  // A cache failure must not hide a successfully retrieved report.
  await accountStorage.setItem(key, JSON.stringify({ entries: data.entries })).catch(() => {});
  if (getSession()?.user.id !== account) throw new Error('Account changed');
  return data.entries;
}
