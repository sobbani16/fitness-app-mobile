export function numeric(text: string): number | null {
  if (!/^\d+(?:[.,]\d+)?$/.test(text.trim())) return null;
  const value = Number(text.trim().replace(',', '.'));
  return Number.isFinite(value) && value <= 100000 ? value : null;
}
export function portionRatio(basis: string, amount: string, unit: 'g' | 'ml' | 'servings' | 'package', packageServings: string) {
  const serving = numeric(basis), quantity = numeric(amount);
  if (quantity === null || quantity <= 0) return null;
  if (unit === 'servings') return quantity;
  if (unit === 'package') { const count = numeric(packageServings); return count && count > 0 ? quantity * count : null; }
  return serving && serving > 0 ? quantity / serving : null;
}
export function scaleLabel(value: string, ratio: number | null, calories = false): number | null {
  const number = numeric(value);
  if (number === null || ratio === null) return null;
  const scaled = number * ratio;
  if (!Number.isFinite(scaled) || scaled > 100000) return null;
  const precision = calories ? 1 : 10;
  return Math.round((scaled + Number.EPSILON * Math.max(1, scaled)) * precision) / precision;
}
