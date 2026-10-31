// Account-scoped weather persistence: a short-lived forecast cache and an
// optional user-chosen location so the app never needs to prompt for
// precise device location just to show conditions.

import { accountKey } from './session';
import { accountStorage as AsyncStorage } from './accountStorage';
import type { WeatherResponse } from '../api/weather';

const CACHE_KEY = 'fitness.weather.cache.v1';
const LOCATION_KEY = 'fitness.weather.location.v1';
export const WEATHER_TTL_MS = 30 * 60 * 1000;

export interface CachedWeather {
  weather: WeatherResponse;
  fetchedAt: string;      // ISO timestamp shown to the user
  latitude: number;
  longitude: number;
  locationLabel?: string; // e.g. saved city name or reverse-geocoded place
  /** 'city' caches were fetched for a saved city — they must not be reused for
   *  device-location weather after the city is cleared. Undefined on older
   *  caches; a label on those implies 'city'. */
  source?: 'device' | 'city';
}

export interface SavedLocation {
  latitude: number;
  longitude: number;
  label: string;
}

export async function loadWeatherCache(): Promise<CachedWeather | null> {
  try {
    const raw = await AsyncStorage.getItem(accountKey(CACHE_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.weather || typeof parsed.fetchedAt !== 'string') return null;
    return parsed as CachedWeather;
  } catch { return null; }
}

export async function saveWeatherCache(entry: CachedWeather): Promise<void> {
  await AsyncStorage.setItem(accountKey(CACHE_KEY), JSON.stringify(entry));
}

export function cacheIsFresh(entry: CachedWeather | null, now: Date = new Date()): boolean {
  if (!entry) return false;
  const age = now.getTime() - Date.parse(entry.fetchedAt);
  return Number.isFinite(age) && age >= 0 && age < WEATHER_TTL_MS;
}

export async function loadSavedLocation(): Promise<SavedLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(accountKey(LOCATION_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(parsed?.latitude) || !Number.isFinite(parsed?.longitude) || typeof parsed.label !== 'string') return null;
    return parsed as SavedLocation;
  } catch { return null; }
}

export async function saveLocation(location: SavedLocation | null): Promise<void> {
  const key = accountKey(LOCATION_KEY);
  if (location) await AsyncStorage.setItem(key, JSON.stringify(location));
  else await AsyncStorage.removeItem(key);
}
