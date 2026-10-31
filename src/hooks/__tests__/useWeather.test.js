jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../api/weather', () => ({ getWeather: jest.fn(), geocodeCity: jest.fn() }));
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Low: 1 },
}));
const React = require('react');
const { create, act } = require('react-test-renderer');
const Location = require('expo-location');
const { getWeather, geocodeCity } = require('../../api/weather');
const { saveWeatherCache, saveLocation } = require('../../storage/weather');
const { useWeather } = require('../useWeather');
let current, tree;
function Harness() { current = useWeather(); return null; }
const forecast = { tempC: 21, precipitation: 0, weatherCode: 2, condition: 'pleasant', description: 'partly cloudy' };
beforeEach(() => {
  jest.clearAllMocks();
  Location.getForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
  Location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
  Location.getLastKnownPositionAsync.mockResolvedValue({ coords: { latitude: 18.5, longitude: 73.8 } });
  getWeather.mockResolvedValue(forecast);
  geocodeCity.mockResolvedValue([{ name: 'Pune', latitude: 18.5, longitude: 73.8 }]);
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = null; });
const mount = async () => { await act(async () => { tree = create(<Harness />); }); };

it('does not prompt for location on load when permission is undetermined', async () => {
  await mount();
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(current.permission).toBe('undetermined');
  expect(getWeather).not.toHaveBeenCalled();
});

it('fetches automatically when permission was already granted, without prompting', async () => {
  Location.getForegroundPermissionsAsync.mockResolvedValue({ granted: true });
  await mount();
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(getWeather).toHaveBeenCalledWith(18.5, 73.8);
  expect(current.weather).toEqual(forecast);
  expect(current.stale).toBe(false);
});

it('serves a fresh cache without a network call', async () => {
  Location.getForegroundPermissionsAsync.mockResolvedValue({ granted: true });
  await saveWeatherCache({ weather: forecast, fetchedAt: new Date().toISOString(), latitude: 1, longitude: 2 });
  await mount();
  expect(getWeather).not.toHaveBeenCalled();
  expect(current.weather).toEqual(forecast);
});

it('keeps stale cached data visible when the refresh fails', async () => {
  Location.getForegroundPermissionsAsync.mockResolvedValue({ granted: true });
  await saveWeatherCache({ weather: forecast, fetchedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), latitude: 1, longitude: 2 });
  getWeather.mockRejectedValue(new Error('offline'));
  await mount();
  expect(current.weather).toEqual(forecast);
  expect(current.stale).toBe(true);
  expect(current.error).toContain('last saved forecast');
});

it('uses a saved city instead of device location and never prompts', async () => {
  Location.getForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
  await saveLocation({ latitude: 18.5, longitude: 73.8, label: 'Pune' });
  await mount();
  expect(getWeather).toHaveBeenCalledWith(18.5, 73.8);
  expect(current.savedLocation.label).toBe('Pune');
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
});

it('saves a city through geocoding and clears it again', async () => {
  await mount();
  await act(async () => { expect(await current.setCity('Pune')).toBe('saved'); });
  expect(geocodeCity).toHaveBeenCalledWith('Pune');
  expect(current.savedLocation.label).toBe('Pune');
  await act(async () => { expect(await current.setCity(null)).toBe('cleared'); });
  expect(current.savedLocation).toBeNull();
});

it('prompts only for the explicit connect action', async () => {
  Location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
  await mount();
  await act(async () => { await current.connect(); });
  expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(getWeather).toHaveBeenCalled();
});

it('explicit refresh fetches again even when the cached forecast is fresh', async () => {
  Location.getForegroundPermissionsAsync.mockResolvedValue({ granted: true });
  await mount();
  getWeather.mockClear();
  await act(async () => current.refresh());
  expect(getWeather).toHaveBeenCalledTimes(1);
});
