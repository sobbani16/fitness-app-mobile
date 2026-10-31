import { weatherSuggestion, weatherSummaryLine } from '../weatherContext';
import type { WeatherResponse } from '../../api/weather';

const w = (condition: WeatherResponse['condition'], tempC: number | null): WeatherResponse => ({
  tempC, precipitation: condition === 'rainy' ? 2 : 0, weatherCode: 3, condition, description: 'partly cloudy',
});

describe('weatherSuggestion', () => {
  it('preserves rest days regardless of conditions', () => {
    expect(weatherSuggestion({ weather: w('pleasant', 20), workoutPlanned: false, restDay: true })).toBeNull();
    expect(weatherSuggestion({ weather: w('rainy', 12), workoutPlanned: false, restDay: true })).toBeNull();
  });
  it('offers an indoor alternative for a planned session in rain', () => {
    expect(weatherSuggestion({ weather: w('rainy', 15), workoutPlanned: true, restDay: false })).toContain('indoor');
  });
  it('suggests cooler timing in extreme heat', () => {
    expect(weatherSuggestion({ weather: w('hot', 35), workoutPlanned: true, restDay: false })).toContain('cooler');
  });
  it('treats pleasant conditions as an option, never an obligation', () => {
    const text = weatherSuggestion({ weather: w('pleasant', 20), workoutPlanned: false, restDay: false })!;
    expect(text).toContain('optional');
    expect(text).not.toMatch(/calorie|burn|earn/i);
  });
  it('never promises outcomes in any message', () => {
    for (const condition of ['hot', 'rainy', 'pleasant'] as const) {
      for (const workoutPlanned of [true, false]) {
        const text = weatherSuggestion({ weather: w(condition, 30), workoutPlanned, restDay: false });
        expect(text ?? '').not.toMatch(/kcal|calorie|lose weight|burn/i);
      }
    }
  });
  it('summarizes condition and temperature compactly', () => {
    expect(weatherSummaryLine(w('pleasant', 21.4))).toBe('partly cloudy · 21°');
    expect(weatherSummaryLine(w('pleasant', null))).toBe('partly cloudy');
  });
});

test('does not describe unknown or freezing conditions as comfortable', () => {
  expect(weatherSuggestion({ weather: w('pleasant', null), workoutPlanned: false, restDay: false })).toBeNull();
  expect(weatherSuggestion({ weather: w('pleasant', -10), workoutPlanned: true, restDay: false })).not.toContain('comfortable');
});
