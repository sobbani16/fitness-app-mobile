import { numeric, portionRatio, scaleLabel } from '../labelPortion';
it('scales 200 kcal per 100 g to 300 kcal for 150 g', () => {
  expect(scaleLabel('200', portionRatio('100', '150', 'g', ''), true)).toBe(300);
});
it('supports decimal servings, packages and matched volume units without assuming density', () => {
  expect(portionRatio('30', '1.5', 'servings', '')).toBe(1.5);
  expect(portionRatio('30', '0.5', 'package', '4')).toBe(2);
  expect(portionRatio('250', '125', 'ml', '')).toBe(0.5);
  expect(scaleLabel('3.3', 1.5)).toBe(5);
  expect(numeric('1,5')).toBe(1.5);
});
it('preserves unknown vs zero and rejects invalid quantities', () => {
  expect(scaleLabel('', 1)).toBeNull(); expect(scaleLabel('0', 1)).toBe(0);
  for (const value of ['', '-2', 'Infinity', '1e5', 'NaN', '1,2,3']) expect(numeric(value)).toBeNull();
  expect(portionRatio('0', '150', 'g', '')).toBeNull();
  expect(portionRatio('100', '0', 'g', '')).toBeNull();
  expect(portionRatio('100', '1', 'package', '')).toBeNull();
});
