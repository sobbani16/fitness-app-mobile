import { MenuItem } from '../api/labelScanner';

// A user decision about a number the parser couldn't confidently classify.
// 'price' confirms it as a price, 'calories' treats it as printed kcal,
// 'quantity' discards it (it was a size/count), 'ignore' drops it entirely.
export interface MenuCorrection {
  kind: 'price' | 'calories' | 'quantity' | 'ignore';
  value?: number;
  currency?: string | null;
}

export function applyMenuCorrection(item: MenuItem, c: MenuCorrection): MenuItem {
  const base: MenuItem = { ...item, priceAmbiguous: false };
  const num = c.value != null && Number.isFinite(c.value) && c.value >= 0 ? c.value : undefined;
  if (c.kind === 'price') return { ...base, price: num ?? item.price, currency: c.currency ?? item.currency, userCorrected: true };
  if (c.kind === 'calories') return { ...base, price: null, calories: num ?? item.price, calorieSource: 'user-entered', explanation: 'Calories confirmed by you from the menu photo.', userCorrected: true };
  // quantity/ignore: the number was not a price and contributes nothing to nutrition.
  return { ...base, price: null, userCorrected: true };
}
