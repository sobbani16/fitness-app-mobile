import { applyMenuCorrection } from '../menuCorrections';
import { MenuItem } from '../../api/labelScanner';

const base: MenuItem = {
  name: 'Paneer Tikka', description: null, price: 280, currency: null,
  calories: null, calorieSource: null, section: 'Starters',
  priceAmbiguous: true, nutritionSource: 'insufficient_information',
  estimate: null, explanation: '',
};

test('confirming a bare number as price keeps it with chosen currency', () => {
  const r = applyMenuCorrection(base, { kind: 'price', currency: 'INR' });
  expect(r.price).toBe(280); expect(r.currency).toBe('INR');
  expect(r.priceAmbiguous).toBe(false); expect(r.userCorrected).toBe(true);
});

test('marking a number as calories moves it out of price', () => {
  const r = applyMenuCorrection(base, { kind: 'calories', value: 320 });
  expect(r.price).toBeNull(); expect(r.calories).toBe(320);
  expect(r.calorieSource).toBe('user-entered');
});

test('quantity and ignore drop the number without touching nutrition', () => {
  const est = { ...base, estimate: { calories: { min: 300, max: 400, portionGMin: 150, portionGMax: 250 }, proteinG: { min: 10, max: 18 }, carbsG: { min: 5, max: 9 }, fatG: { min: 14, max: 24 } }, nutritionSource: 'estimated' as const };
  const q = applyMenuCorrection(est, { kind: 'quantity' });
  expect(q.price).toBeNull(); expect(q.estimate).toEqual(est.estimate);
  const ig = applyMenuCorrection(est, { kind: 'ignore' });
  expect(ig.price).toBeNull(); expect(ig.nutritionSource).toBe('estimated');
});

test('edited numeric value replaces the parsed one', () => {
  const r = applyMenuCorrection(base, { kind: 'price', value: 299, currency: 'INR' });
  expect(r.price).toBe(299);
});

test('invalid numbers are rejected, not zeroed', () => {
  const r = applyMenuCorrection({ ...base, price: 280 }, { kind: 'price', value: -5 });
  expect(r.price).toBe(280);
});
