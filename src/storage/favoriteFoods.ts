import { accountKey, getSession } from './session';
import { accountStorage } from './accountStorage';
import { LoggedMeal, loadMealsFor } from './meals';
let serial: Promise<unknown> = Promise.resolve();
export async function loadFavorites(): Promise<LoggedMeal[]> {
  const raw = await accountStorage.getItem(accountKey('fitness.favoriteFoods.v1'));
  const data = raw ? JSON.parse(raw) : [];
  return Array.isArray(data) ? data : [];
}
export function setFavorite(meal: LoggedMeal, favorite: boolean): Promise<LoggedMeal[]> {
  const account = getSession()?.user.id;
  const key = accountKey('fitness.favoriteFoods.v1');
  const action = async () => {
    if (!account || getSession()?.user.id !== account) throw new Error('Account changed');
    const items: LoggedMeal[] = JSON.parse(await accountStorage.getItem(key) || '[]');
    const next = items.filter(item => item.id !== meal.id);
    // Keep nutrition, not private photo files, in reusable favorites.
    if (favorite) next.unshift({ ...meal, photoUri: undefined });
    if (getSession()?.user.id !== account) throw new Error('Account changed');
    await accountStorage.setItem(key, JSON.stringify(next));
    return next;
  };
  const next = serial.then(action, action); serial = next.catch(() => {}); return next;
}
export async function loadRecentFoods(): Promise<LoggedMeal[]> {
  const account = getSession()?.user.id;
  const days = await Promise.all(Array.from({ length: 30 }, (_, offset) => {
    const day = new Date(); day.setDate(day.getDate() - offset); return loadMealsFor(day);
  }));
  if (getSession()?.user.id !== account) throw new Error('Account changed');
  const unique = new Map<string, LoggedMeal>();
  for (const meal of days.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const key = meal.name.trim().toLowerCase(); if (!unique.has(key)) unique.set(key, meal);
  }
  return [...unique.values()].slice(0, 20);
}
