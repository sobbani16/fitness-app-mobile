jest.mock('expo-notifications', () => ({
  DEFAULT_ACTION_IDENTIFIER: 'default',
  setNotificationHandler: jest.fn(),
  setNotificationCategoryAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
  clearLastNotificationResponseAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../navigation/navigationRef', () => ({ navigateToTab: jest.fn() }));
jest.mock('../../api/dailyStats', () => ({ addWater: jest.fn().mockResolvedValue(undefined) }));
const response = (action = 'default') => ({
  actionIdentifier: action,
  notification: { date: 123, request: { identifier: 'workout-1', content: { data: { deepLink: 'LogExercise' } } } },
});

beforeEach(() => { jest.resetModules(); });
it('recovers a cold navigation tap without routing it twice when the listener also fires', async () => {
  const Notifications = require('expo-notifications');
  const { navigateToTab } = require('../../navigation/navigationRef');
  Notifications.getLastNotificationResponseAsync.mockResolvedValue(response());
  await require('../notifications').setupNotifications();
  expect(navigateToTab).toHaveBeenCalledTimes(1);
  expect(navigateToTab).toHaveBeenCalledWith('LogExercise');
  expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalledTimes(1);
  const listener = Notifications.addNotificationResponseReceivedListener.mock.calls[0][0];
  listener(response());
  expect(navigateToTab).toHaveBeenCalledTimes(1);
});

it('does not replay a previous water write while recovering cold navigation', async () => {
  const Notifications = require('expo-notifications');
  const { addWater } = require('../../api/dailyStats');
  Notifications.getLastNotificationResponseAsync.mockResolvedValue(response('add-water'));
  await require('../notifications').setupNotifications();
  expect(addWater).not.toHaveBeenCalled();
});
