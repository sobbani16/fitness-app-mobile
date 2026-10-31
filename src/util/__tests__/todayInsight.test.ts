import { todayInsight } from '../todayInsight';

const base = {
  mealsLogged: 2,
  mealsWithMissingNutrition: false,
  caloriesLogged: 800,
  proteinLogged: 40,
  waterMl: 1200,
  waterMlTarget: 2000,
  proteinTarget: 90,
  now: new Date('2024-06-01T10:00:00'),
};

describe('todayInsight', () => {
  it('prompts logging when the diary is empty, without assuming intake', () => {
    const insight = todayInsight({ ...base, mealsLogged: 0 });
    expect(insight.action).toBe('meal');
    expect(insight.evidence).toContain('No meals');
  });
  it('nudges water only behind pace and after midday', () => {
    expect(todayInsight({ ...base, waterMl: 400, now: new Date('2024-06-01T13:00:00') }).action).toBe('water');
    expect(todayInsight({ ...base, waterMl: 400, now: new Date('2024-06-01T08:00:00') }).action).not.toBe('water');
    expect(todayInsight({ ...base, waterMl: 1600, now: new Date('2024-06-01T13:00:00') }).action).not.toBe('water');
  });
  it('flags low logged protein late in the day against the user target', () => {
    const insight = todayInsight({ ...base, proteinLogged: 20, now: new Date('2024-06-01T17:00:00') });
    expect(insight.action).toBe('diary');
    expect(insight.finding).toContain('protein');
  });
  it('surfaces incomplete nutrition so totals are not misread', () => {
    expect(todayInsight({ ...base, mealsWithMissingNutrition: true }).finding).toContain('missing nutrition');
  });
  it('falls back to a neutral summary without inventing claims', () => {
    const insight = todayInsight(base);
    expect(insight.action).toBe('diary');
    expect(insight.reason).toContain('logged meals');
  });
});
