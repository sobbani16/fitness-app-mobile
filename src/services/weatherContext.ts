// Rule-based weather context for Today. Deterministic only: conditions +
// the user's own plan/preferences. Never promises calorie outcomes and never
// frames activity as owed or as compensation for eating.

import type { WeatherResponse } from '../api/weather';

export interface WeatherContextInput {
  weather: WeatherResponse;
  workoutPlanned: boolean;
  restDay: boolean;
}

const VERY_HOT_C = 32;

/** One concise suggestion, or null when conditions warrant no comment. */
export function weatherSuggestion({ weather, workoutPlanned, restDay }: WeatherContextInput): string | null {
  const temp = weather.tempC;
  const veryHot = temp != null && temp >= VERY_HOT_C;
  const wet = weather.condition === 'rainy';

  if (restDay) return null; // preserve rest — weather doesn't create obligations
  if (temp == null || !Number.isFinite(temp)) return null;
  if (temp <= 0) return 'Freezing conditions — check local conditions and consider an indoor option.';
  if (workoutPlanned) {
    if (wet) return 'Wet outside — consider an indoor alternative to your planned session.';
    if (veryHot) return `Around ${Math.round(temp!)}° — a cooler time of day or an indoor session may feel better.`;
    return 'Conditions look comfortable for your planned session.';
  }
  if (wet) return 'Wet conditions — an indoor option may suit better today.';
  if (veryHot) return `Around ${Math.round(temp!)}° — if you head out, cooler morning or evening hours are easier.`;
  return 'Comfortable conditions — an optional walk fits today if you feel like it.';
}

/** Apple-Weather-style glyph for a WMO code — icon + text, never icon alone. */
export function weatherIcon(code: number | null | undefined): string {
  if (code == null || !Number.isFinite(code)) return 'cloud-outline';
  if (code === 0) return 'sunny';
  if (code <= 3) return 'partly-sunny';
  if (code === 45 || code === 48) return 'cloudy';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 85 && code <= 86) return 'snow';
  if (code >= 95) return 'thunderstorm';
  return 'rainy';
}

export function weatherSummaryLine(weather: WeatherResponse): string {
  const temp = weather.tempC != null ? ` · ${Math.round(weather.tempC)}°` : '';
  return `${weather.description}${temp}`;
}
