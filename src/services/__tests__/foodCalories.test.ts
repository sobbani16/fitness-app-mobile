import { caloriesForPortion, macrosForPortion } from '../foodCalories';

describe('caloriesForPortion', () => {
  it('scales linearly with grams', () => {
    expect(caloriesForPortion(200, 100)).toBe(200);
    expect(caloriesForPortion(200, 250)).toBe(500);
    expect(caloriesForPortion(150, 300)).toBe(450);
  });

  it('rounds to nearest integer', () => {
    expect(caloriesForPortion(123, 77)).toBe(Math.round((123 * 77) / 100));
  });

  it('returns 0 for invalid inputs', () => {
    expect(caloriesForPortion(-1, 100)).toBe(0);
    expect(caloriesForPortion(100, 0)).toBe(0);
    expect(caloriesForPortion(100, -50)).toBe(0);
    expect(caloriesForPortion(NaN, 100)).toBe(0);
  });
});

describe('macrosForPortion', () => {
  it('scales each macro linearly', () => {
    const base = { protein_g: 10, carbs_g: 20, fat_g: 5 };
    expect(macrosForPortion(base, 200)).toEqual({
      protein_g: 20,
      carbs_g: 40,
      fat_g: 10,
    });
  });

  it('rounds to 1 decimal', () => {
    const base = { protein_g: 3.33, carbs_g: 7.77, fat_g: 1.11 };
    const out = macrosForPortion(base, 123);
    expect(out.protein_g).toBeCloseTo(4.1, 1);
    expect(out.carbs_g).toBeCloseTo(9.6, 1);
    expect(out.fat_g).toBeCloseTo(1.4, 1);
  });

  it('returns zero-macros for invalid portions', () => {
    const base = { protein_g: 10, carbs_g: 20, fat_g: 5 };
    expect(macrosForPortion(base, 0)).toEqual({ protein_g: 0, carbs_g: 0, fat_g: 0 });
    expect(macrosForPortion(base, -1)).toEqual({ protein_g: 0, carbs_g: 0, fat_g: 0 });
  });
});
