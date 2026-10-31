import { LoggedMeal } from '../../storage/meals';
import { buildRepeatMeal, isTrustedRepeatMeal, parseWeightInput, quickRepeatChoices } from '../quickLog';

const base: LoggedMeal = {
  id: 'm-1', createdAt: '2024-01-01T08:00:00.000Z', name: 'Oats', calories: 300, feedback: 'saved',
  macros: { protein_g: 10, carbs_g: 50, fat_g: 6 }, quantityG: 80,
  ingredientId: 'ing-1', source: 'ingredient: usda',
  nutritionSnapshot: { verificationLevel: 'SOURCE_BACKED_FULL' }, photoUri: 'file:///photo.jpg',
};

describe('isTrustedRepeatMeal', () => {
  it('trusts a weighed catalog meal with verified nutrition', () => {
    expect(isTrustedRepeatMeal(base)).toBe(true);
  });
  it.each<[string, Partial<LoggedMeal>]>([
    ['missing portion', { quantityG: undefined }],
    ['zero portion', { quantityG: 0 }],
    ['manual entry', { source: 'Manual entry' }],
    ['AI estimate', { source: 'AI estimate', nutritionSnapshot: undefined }],
    ['user-edited nutrition', { nutritionSnapshot: { userEdited: true } }],
    ['estimated catalog profile', { nutritionSnapshot: { verificationLevel: 'ESTIMATED' } }],
    ['review conflict', { nutritionSnapshot: { verificationLevel: 'REVIEW_CONFLICT' } }],
    ['generic composition', { nutritionSnapshot: { verificationLevel: 'GENERIC_COMPOSITION' } }],
    ['partially backed macros', { nutritionSnapshot: { verificationLevel: 'PARTIALLY_SOURCE_BACKED' } }],
    ['unknown catalog provenance', { nutritionSnapshot: undefined }],
    ['missing macros', { macros: { protein_g: NaN, carbs_g: 50, fat_g: 6 } }],
    ['no verified source', { ingredientId: undefined, source: 'API estimate', nutritionSnapshot: undefined }],
  ])('requires review for %s', (_label, patch) => {
    expect(isTrustedRepeatMeal({ ...base, ...patch })).toBe(false);
  });
});

describe('buildRepeatMeal', () => {
  it('copies nutrition with a fresh identity and no photo', () => {
    const copy = buildRepeatMeal(base, new Date('2024-06-02T12:00:00.000Z'));
    expect(copy).toMatchObject({ name: 'Oats', calories: 300, quantityG: 80, ingredientId: 'ing-1' });
    expect(copy.id).not.toBe(base.id);
    expect(copy.createdAt).toBe('2024-06-02T12:00:00.000Z');
    expect(copy.photoUri).toBeUndefined();
  });
});

describe('parseWeightInput', () => {
  it('parses metric input and rounds to 0.1 kg', () => {
    expect(parseWeightInput(' 70.55 ', 'metric')).toEqual({ weightKg: 70.6 });
  });
  it('converts imperial input to canonical kg', () => {
    const parsed = parseWeightInput('154', 'imperial');
    expect(parsed.weightKg).toBeCloseTo(69.9, 0);
  });
  it.each(['abc', '-5', '0', '15', '450'])('rejects %s', input => {
    expect(parseWeightInput(input, 'metric').error).toBeTruthy();
  });
});

describe('quickRepeatChoices', () => {
  it('puts favorites first and deduplicates by name', () => {
    const recent = { ...base, id: 'm-2' };
    expect(quickRepeatChoices([base], [recent, { ...base, id: 'm-3', name: 'Eggs' }])).toHaveLength(2);
    expect(quickRepeatChoices([], [base, recent], 1)).toHaveLength(1);
  });
});
