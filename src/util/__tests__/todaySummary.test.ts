import { sameLocalDay, sumKnown, todaySummary, validTarget } from '../todaySummary';
import type { LoggedMeal } from '../../storage/meals';
const meal = (changes: Partial<LoggedMeal> = {}): LoggedMeal => ({ id: '1', name: 'Lunch', createdAt: new Date(2026, 9, 16, 12).toISOString(), calories: 400,
  macros: { protein_g: 20, carbs_g: 40, fat_g: 15 }, feedback: '', source: 'manual', ...changes });
it('keeps missing fiber unknown without losing known calories/macros', () => {
  const result = todaySummary([meal(), meal({ id: '2', macros: { protein_g: 10, carbs_g: 10, fat_g: 5, fiber_g: 3 } })], new Date(2026, 9, 16, 18));
  expect(result).toMatchObject({ calories: 800, protein: 30, carbs: 50, fat: 20, fiber: null });
});
it('distinguishes an empty diary from invalid nutrition values', () => {
  expect(todaySummary([]).calories).toBe(0);
  expect(sumKnown([100, NaN])).toBeNull();
  expect(sumKnown([0, -1])).toBeNull();
  expect(sumKnown([0, undefined])).toBeNull();
  expect(sumKnown([0, 0])).toBe(0);
  expect(validTarget(0)).toBeNull();
  expect(validTarget(Infinity)).toBeNull();
  expect(validTarget(2100)).toBe(2100);
});
it('uses local calendar days and ignores stale or invalid dates after midnight', () => {
  const now = new Date(2026, 9, 17, 0, 1);
  expect(sameLocalDay(meal().createdAt, now)).toBe(false);
  expect(todaySummary([meal(), meal({ createdAt: 'invalid' })], now).meals).toEqual([]);
  expect(sameLocalDay(new Date(2026, 9, 17, 0, 0).toISOString(), now)).toBe(true);
});
