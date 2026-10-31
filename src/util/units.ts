export type UnitSystem = 'metric' | 'imperial';

// Countries that primarily use the imperial system (ISO 3166-1 alpha-2).
// Everywhere else (e.g. IN, most of the world) defaults to metric.
const IMPERIAL_COUNTRIES = new Set(['US', 'LR', 'MM']);

/**
 * Maps an ISO country code (e.g. from expo-location reverse geocode) to the
 * unit system commonly used there. Defaults to metric when unknown.
 */
export function countryToUnitSystem(isoCountryCode?: string | null): UnitSystem {
  if (!isoCountryCode) return 'metric';
  return IMPERIAL_COUNTRIES.has(isoCountryCode.toUpperCase()) ? 'imperial' : 'metric';
}

export const unitLabels = (units: UnitSystem) => ({
  weight: units === 'imperial' ? 'lb' : 'kg',
  height: units === 'imperial' ? 'ft/in' : 'cm',
  distance: units === 'imperial' ? 'mi' : 'km',
});

// Canonical storage is always metric (kg, cm). These helpers convert only for display / input.

export const kgToLb = (kg: number): number => kg * 2.2046226218;
export const lbToKg = (lb: number): number => lb / 2.2046226218;

export const cmToIn = (cm: number): number => cm / 2.54;
export const inToCm = (inches: number): number => inches * 2.54;

export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalIn = cmToIn(cm);
  const ft = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn - ft * 12);
  // Handle rounding overflow (e.g. 11.6 → 12 in → promote to next ft).
  if (inches === 12) return { ft: ft + 1, inches: 0 };
  return { ft, inches };
}

export function ftInToCm(ft: number, inches: number): number {
  return inToCm(ft * 12 + inches);
}

export function formatWeight(weightKg: number, units: UnitSystem): string {
  if (units === 'imperial') return `${Math.round(kgToLb(weightKg))} lb`;
  return `${weightKg} kg`;
}

export function formatHeight(heightCm: number, units: UnitSystem): string {
  if (units === 'imperial') {
    const { ft, inches } = cmToFtIn(heightCm);
    return `${ft}′${inches}″`;
  }
  return `${heightCm} cm`;
}

// Water volume display units. Canonical storage stays milliliters — these are display-only.
export type VolumeUnit = 'cup_imp' | 'cup_us' | 'floz_imp' | 'floz_us' | 'l' | 'ml' | 'pt_imp' | 'pt_us';

export const VOLUME_UNITS: { key: VolumeUnit; name: string; symbol: string; mlPerUnit: number }[] = [
  { key: 'cup_imp', name: 'cups (Imperial)', symbol: 'cups', mlPerUnit: 284.131 },
  { key: 'cup_us', name: 'cups (US)', symbol: 'cups', mlPerUnit: 236.588 },
  { key: 'floz_imp', name: 'fl oz (Imperial)', symbol: 'fl oz', mlPerUnit: 28.4131 },
  { key: 'floz_us', name: 'fl oz (US)', symbol: 'fl oz', mlPerUnit: 29.5735 },
  { key: 'l', name: 'L', symbol: 'L', mlPerUnit: 1000 },
  { key: 'ml', name: 'mL', symbol: 'mL', mlPerUnit: 1 },
  { key: 'pt_imp', name: 'pt (Imperial)', symbol: 'pt', mlPerUnit: 568.261 },
  { key: 'pt_us', name: 'pt (US)', symbol: 'pt', mlPerUnit: 473.176 },
];

const volumeDef = (unit: VolumeUnit) => VOLUME_UNITS.find(u => u.key === unit) ?? VOLUME_UNITS[5];

const trim = (v: number, decimals: number) =>
  Number(v.toFixed(decimals)).toLocaleString(undefined, { maximumFractionDigits: decimals });

export function formatVolume(ml: number, unit: VolumeUnit = 'ml'): string {
  const u = volumeDef(unit);
  const v = ml / u.mlPerUnit;
  if (unit === 'ml') return `${Math.round(v).toLocaleString()} mL`;
  if (unit === 'l') return `${trim(v, v >= 10 ? 1 : 2)} L`;
  if (unit === 'floz_us' || unit === 'floz_imp') return `${Math.round(v)} fl oz`;
  return `${trim(v, 1)} ${u.symbol}`;
}

