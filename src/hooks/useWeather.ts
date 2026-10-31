import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { geocodeCity, getWeather, WeatherResponse } from '../api/weather';
import {
  cacheIsFresh, loadSavedLocation, loadWeatherCache, saveLocation, saveWeatherCache,
  CachedWeather, SavedLocation,
} from '../storage/weather';

export type WeatherPermission = 'granted' | 'denied' | 'undetermined' | 'checking';

interface UseWeatherState {
  weather: WeatherResponse | null;
  fetchedAt: string | null;
  stale: boolean;
  loading: boolean;
  /** Non-blocking message; cached data stays visible when set. */
  error: string | null;
  permission: WeatherPermission;
  savedLocation: SavedLocation | null;
  /** Resolved place name — saved city or reverse-geocoded device location. */
  locationLabel: string | null;
  /** Explicit user action — may prompt for location permission. */
  connect: () => Promise<void>;
  /** Set or clear the manual city location. */
  setCity: (name: string | null) => Promise<'saved' | 'not-found' | 'cleared' | 'error'>;
  refresh: () => Promise<void>;
}

export function useWeather(): UseWeatherState {
  const [cached, setCached] = useState<CachedWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<WeatherPermission>('checking');
  const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(null);
  const generation = useRef(0);
  const live = (gen: number) => gen === generation.current;

  const finish = useCallback(async (gen: number, lat: number, lon: number, label?: string, source: 'device' | 'city' = 'device') => {
    try {
      const weather = await getWeather(lat, lon);
      if (!live(gen)) return;
      const entry: CachedWeather = { weather, fetchedAt: new Date().toISOString(), latitude: lat, longitude: lon, locationLabel: label, source };
      await saveWeatherCache(entry).catch(() => {});
      if (live(gen)) { setCached(entry); setError(null); }
    } catch {
      // Keep any stale cached forecast visible rather than blanking it.
      if (live(gen)) setError('Weather could not update. Showing the last saved forecast.');
    }
  }, []);

  const load = useCallback(async (askPermission = false, force = false) => {
    const gen = ++generation.current;
    setError(null);
    setLoading(true);
    try {
      const [saved, cache] = await Promise.all([loadSavedLocation(), loadWeatherCache()]);
      if (!live(gen)) return;
      setSavedLocation(saved);
      setCached(cache);

      let perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted && askPermission) perm = await Location.requestForegroundPermissionsAsync();
      if (!live(gen)) return;
      setPermission(perm.granted ? 'granted' : perm.canAskAgain ? 'undetermined' : 'denied');

      // A saved city always wins: precise location is never needed for a forecast.
      if (saved) {
        if (force || !cacheIsFresh(cache) || cache?.latitude !== saved.latitude || cache?.longitude !== saved.longitude) await finish(gen, saved.latitude, saved.longitude, saved.label, 'city');
        return;
      }
      if (!perm.granted) {
        // Respect denial/undetermined silently — the cached forecast (if any) stays.
        return;
      }
      // A labeled cache without a device source came from a saved city — after
      // clearing it, fall through to refetch for the device location.
      const cityCache = cache?.source === 'city' || (cache?.source === undefined && cache?.locationLabel != null);
      if (!force && cacheIsFresh(cache) && !cityCache) return;
      const last = await Location.getLastKnownPositionAsync();
      const pos = last ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      if (!live(gen)) return;
      let label: string | undefined;
      try {
        const places = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        if (!live(gen)) return;
        label = places[0]?.city ?? places[0]?.district ?? places[0]?.subregion ?? undefined;
      } catch { /* forecast still loads without a place name */ }
      await finish(gen, pos.coords.latitude, pos.coords.longitude, label);
    } catch {
      if (live(gen)) setError('Weather is unavailable on this device right now.');
    } finally {
      if (live(gen)) setLoading(false);
    }
  }, [finish]);

  useEffect(() => {
    const requests = generation;
    void load(false);
    return () => { requests.current++; };
  }, [load]);

  const connect = useCallback(() => load(true), [load]);

  const setCity = useCallback(async (name: string | null) => {
    const gen = ++generation.current;
    try {
      if (name === null) { await saveLocation(null); setSavedLocation(null); await load(false); return 'cleared'; }
      const trimmed = name.trim();
      if (!trimmed) return 'error';
      const match = (await geocodeCity(trimmed))[0];
      if (!live(gen)) return 'error';
      if (!match) return 'not-found';
      const saved: SavedLocation = { latitude: match.latitude, longitude: match.longitude, label: match.name };
      await saveLocation(saved);
      if (!live(gen)) return 'error';
      setSavedLocation(saved);
      setLoading(true);
      await finish(gen, saved.latitude, saved.longitude, saved.label, 'city');
      if (live(gen)) setLoading(false);
      return 'saved';
    } catch { return 'error'; }
  }, [finish, load]);

  return {
    weather: cached?.weather ?? null,
    fetchedAt: cached?.fetchedAt ?? null,
    stale: cached != null && !cacheIsFresh(cached),
    loading, error, permission, savedLocation,
    locationLabel: cached?.locationLabel ?? null,
    connect, setCity,
    refresh: () => load(false, true),
  };
}
