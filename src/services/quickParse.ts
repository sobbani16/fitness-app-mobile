// Deterministic parser for the quick-entry ("say or type it") field.
// Handles the phrases OS dictation produces for the two fastest logs:
// water and weight. Anything else returns a hint — never guessed.
export type QuickParsed =
  | { type: 'water'; ml: number }
  | { type: 'weight'; weightKg: number }
  | { type: 'none' };

const NUM = '([0-9]+(?:[.,][0-9]+)?)';
const WATER_RE = new RegExp(`(?:water|drank|drunk|drink|hydrat\\w*)[^0-9]*${NUM}?\\s*(ml|millilit\\w*|liters?|litres?|l\\b|ounces?|oz|glasses?|cups?|bottles?)?|${NUM}\\s*(ml|liters?|litres?|ounces?|oz|glasses?|cups?|bottles?|l\\b)\\s*(?:of\\s*)?water`, 'i');
const WEIGHT_RE = new RegExp(`(?:weigh\\w*|weight)[^0-9]*${NUM}\\s*(kg|kilos?|kilograms?|lbs?|pounds?|stone|st\\b)?|${NUM}\\s*(kg|kilograms?|lbs?|pounds?|stone|st\\b)\\s*(?:weigh\\w*|weight)?`, 'i');

const ML_PER = { ml: 1, liter: 1000, oz: 30, glass: 250, cup: 240, bottle: 500 };
const KG_PER = { kg: 1, kilo: 1, kilogram: 1, lb: 1 / 2.20462, lbs: 1 / 2.20462, pound: 1 / 2.20462, stone: 6.35029, st: 6.35029 };

function unitKey(raw?: string): string {
  const u = (raw || 'ml').toLowerCase();
  if (u.startsWith('millilit') || u === 'ml') return 'ml';
  if (u.startsWith('lit') || u === 'l') return 'liter';
  if (u.startsWith('oz') || u.startsWith('ounce')) return 'oz';
  if (u.startsWith('glass')) return 'glass';
  if (u.startsWith('cup')) return 'cup';
  if (u.startsWith('bottle')) return 'bottle';
  return 'ml';
}
function weightKey(raw?: string): string {
  const u = (raw || 'kg').toLowerCase();
  if (u.startsWith('kg') || u.startsWith('kilo')) return 'kg';
  if (u.startsWith('lb') || u.startsWith('pound')) return 'lb';
  if (u.startsWith('st')) return 'stone';
  return 'kg';
}

export function parseQuickText(raw: string, units: 'metric' | 'imperial' = 'metric'): QuickParsed {
  const t = raw.trim();
  if (!t) return { type: 'none' };
  // Reject negation, signed values and multiple amounts rather than silently
  // extracting a positive number from an ambiguous command.
  if (/\b(?:no|not|never|didn't|don't|didn’t|don’t)\b/i.test(t) || /[-−+]\s*\d/.test(t) || (t.match(/\d+(?:[.,]\d+)?/g) || []).length !== 1) return { type: 'none' };
  const num = (m?: string) => (m ? Number(m.replace(',', '.')) : NaN);

  const w = WEIGHT_RE.exec(t);
  if (w) {
    const value = num(w[1] ?? w[3]);
    const kg = value * (KG_PER[weightKey(w[2] ?? w[4] ?? (units === 'imperial' ? 'lb' : 'kg')) as keyof typeof KG_PER] || 1);
    if (Number.isFinite(kg) && kg >= 20 && kg <= 400) return { type: 'weight', weightKg: Math.round(kg * 10) / 10 };
  }
  const wa = WATER_RE.exec(t);
  if (wa) {
    const raw = num(wa[1] ?? wa[3]);
    const value = Number.isFinite(raw) ? raw : 1;
    const key = unitKey(wa[2] ?? wa[4]);
    const ml = value * (ML_PER[key as keyof typeof ML_PER] || 1);
    if (Number.isFinite(ml) && ml >= 10 && ml <= 5000) return { type: 'water', ml: Math.round(ml) };
  }
  return { type: 'none' };
}
