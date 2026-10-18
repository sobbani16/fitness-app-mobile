import { setAnalyticsAdapter, trackEvent } from '../events';
afterEach(() => setAnalyticsAdapter());
it('is disabled by default and never replays prior actions', () => {
  trackEvent('meal_saved');
  const sink = jest.fn(); setAnalyticsAdapter(sink);
  expect(sink).not.toHaveBeenCalled(); trackEvent('meal_saved');
  expect(sink).toHaveBeenCalledWith({ name: 'meal_saved', version: 1 });
});
it('rejects unknown names and strips arbitrary runtime payloads', () => {
  const sink = jest.fn(); setAnalyticsAdapter(sink);
  (trackEvent as Function)('email@example.com', { calories: 123 });
  expect(sink).not.toHaveBeenCalled();
  (trackEvent as Function)('meal_saved', { name: 'Private meal', email: 'email@example.com' });
  expect(sink).toHaveBeenLastCalledWith({ name: 'meal_saved', version: 1 });
  expect(Object.isFrozen(sink.mock.calls[0][0])).toBe(true);
});
it('isolates sync and async adapter failures and stops immediately on withdrawal', async () => {
  setAnalyticsAdapter(() => { throw new Error('private transport failure'); });
  expect(() => trackEvent('meal_saved')).not.toThrow();
  setAnalyticsAdapter(async () => { throw new Error('network'); }); trackEvent('meal_saved');
  await Promise.resolve();
  const sink = jest.fn(); setAnalyticsAdapter(sink); setAnalyticsAdapter(); trackEvent('meal_saved');
  expect(sink).not.toHaveBeenCalled();
});
it('emits only a coarse duration once per confirmed entry', () => {
  const { startEntryTimer } = require('../events');
  const clock = jest.spyOn(Date, 'now').mockReturnValue(1000);
  const sink = jest.fn(); setAnalyticsAdapter(sink);
  const complete = startEntryTimer('food_entry_saved');
  clock.mockReturnValue(62000); complete(); complete();
  expect(sink).toHaveBeenCalledTimes(1);
  expect(sink).toHaveBeenCalledWith({ name: 'food_entry_saved', version: 1, duration: '30_to_120s' });
  clock.mockRestore();
});
