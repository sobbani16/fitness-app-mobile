import { itemMacros } from '../menuLogging';
import type { MenuItem } from '../../api/labelScanner';
test('scales estimated calories and macros once to the same portion', () => {
  const item = { estimate: { calories: { min: 200, max: 400, portionGMin: 200, portionGMax: 400 }, proteinG: { min: 20, max: 40 }, carbsG: { min: 40, max: 80 }, fatG: { min: 10, max: 20 } } } as MenuItem;
  expect(itemMacros(item, 150)).toEqual({ calories: 150, protein_g: 15, carbs_g: 30, fat_g: 7.5 });
  expect(itemMacros(item, 300).calories).toBe(300);
});
test('restaurant calories retain their printed per-item amount', () => {
  expect(itemMacros({ calories: 620 } as MenuItem, 200).calories).toBe(620);
});
