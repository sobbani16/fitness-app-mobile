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
