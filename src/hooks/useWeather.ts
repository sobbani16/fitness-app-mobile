import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { getWeather, WeatherResponse } from '../api/weather';

interface UseWeatherState {
  weather: WeatherResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useWeather(): UseWeatherState {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setError('Location permission denied');
        setWeather(null);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const w = await getWeather(pos.coords.latitude, pos.coords.longitude);
      setWeather(w);
    } catch (e: any) {
      setError(e?.message ?? 'Weather unavailable');
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { weather, loading, error, refresh: load };
}
