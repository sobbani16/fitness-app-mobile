import { api } from './client';

export type WeatherCondition = 'hot' | 'rainy' | 'pleasant';

export interface WeatherResponse {
  tempC: number | null;
  precipitation: number;
  weatherCode: number | null;
  condition: WeatherCondition;
  description: string;
}

export async function getWeather(lat: number, lon: number): Promise<WeatherResponse> {
  const res = await api.get<WeatherResponse>('/weather', { params: { lat, lon } });
  return res.data;
}
