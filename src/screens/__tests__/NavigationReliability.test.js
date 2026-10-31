jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
let mockParams;
const mockDispatch = jest.fn(), mockPrevent = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({ params: mockParams }),
  useNavigation: () => ({ canGoBack: () => false, getState: () => ({ routeNames: ['Main', 'VideoSearch'] }), dispatch: mockDispatch }),
  usePreventRemove: (...args) => mockPrevent(...args),
  useFocusEffect: callback => require('react').useEffect(callback, [callback]),
}));
jest.mock('../../components/KeyboardAwareScrollView', () => 'ScrollContainer');
jest.mock('../../storage/favoriteVideos', () => ({ setPreferredVideo: jest.fn(), toggleWatchLater: jest.fn() }));
jest.mock('../../api/reminders', () => ({
  getReminderPreferences: jest.fn(), getReminderCategories: jest.fn(), getSuggestions: jest.fn(),
  getReminderInstances: jest.fn(), updateReminderPreferences: jest.fn(),
}));
jest.mock('expo-notifications', () => ({}));
jest.mock('../../services/notifications', () => ({ setupNotifications: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../services/reminderSync', () => ({ syncReminderSchedules: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../api/dailyStats', () => ({}));
jest.mock('../../storage/meals', () => ({}));
jest.mock('../../api/personalPlans', () => ({ listPlans: jest.fn(), updateDraft: jest.fn(), confirmPlan: jest.fn(), draftPlan: jest.fn(), listCatalog: jest.fn(async () => []), getSuggestions: jest.fn(async () => ({ suggestions: [] })) }));
jest.mock('../../storage/profile', () => ({ loadProfile: jest.fn().mockResolvedValue(null) }));
const React = require('react'), { create, act } = require('react-test-renderer');
const { Notice, Action } = require('../../design/components');
const reminders = require('../../api/reminders'), plans = require('../../api/personalPlans');
const videos = require('../../storage/favoriteVideos');
const VideoCompare = require('../VideoCompareScreen').default;
const SmartReminders = require('../SmartRemindersScreen').default;
const ReminderInbox = require('../ReminderInboxScreen').default;
const WorkoutPlan = require('../WorkoutPlanScreen').default;
const preferences = { masterEnabled: false, adaptiveEnabled: false, suggestionsMuted: false, weeklyDigest: false, dailyCap: 3, snoozeMinutes: 30, quietStart: null, quietEnd: null };
const video = id => ({ videoId: id, title: id, channelTitle: 'Channel', tags: [], description: '', why: 'Search match', viewCount: null });
const plan = { id: 'plan-1', status: 'draft', version: 1, preferences: {}, plan: { days: [{ weekday: 'mon', exercises: [{ exerciseId: 'squat', sets: 2, reps: '10', restSec: 60 }] }] } };
let tree;
const control = label => tree.root.findAllByProps({ accessibilityLabel: label })[0];
const notice = title => tree.root.findAllByType(Notice).some(node => node.props.title === title);
beforeEach(() => {
  jest.clearAllMocks(); mockParams = undefined;
  reminders.getReminderCategories.mockResolvedValue([]);
  reminders.getSuggestions.mockResolvedValue([]);
  reminders.getReminderPreferences.mockResolvedValue(preferences);
  plans.listPlans.mockResolvedValue([plan]);
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });

it.each([undefined, {}, { videos: {} }, { videos: [video('a'), { videoId: 'b', tags: {} }] }])('recovers malformed video entry without crashing (%p)', async params => {
  mockParams = params;
  await act(async () => { tree = create(<VideoCompare />); });
  expect(notice('Pick two videos')).toBe(true);
  await act(async () => control('Back to results').props.onPress());
  expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'RESET', payload: { index: 0, routes: [{ name: 'VideoSearch', params: {} }] } }));
});

it('reports video preference failure and only announces saved after a successful retry', async () => {
  mockParams = { videos: [video('a'), video('b')], exerciseKey: 'squat' };
  videos.setPreferredVideo.mockRejectedValueOnce(new Error('disk full')).mockResolvedValueOnce({});
  await act(async () => { tree = create(<VideoCompare />); });
  await act(async () => control('Choose this video').props.onPress());
  expect(notice('Preference saved')).toBe(false);
  expect(notice('Please try again')).toBe(true);
  await act(async () => control('Choose this video').props.onPress());
  expect(notice('Preference saved')).toBe(true);
});

it('does not claim persisted preference without an exercise destination', async () => {
  mockParams = { videos: [video('a'), video('b')] };
  await act(async () => { tree = create(<VideoCompare />); });
  await act(async () => control('Choose this video').props.onPress());
  expect(notice('Video selected')).toBe(true);
  expect(notice('Preference saved')).toBe(false);
  expect(videos.setPreferredVideo).not.toHaveBeenCalled();
});

it('offers Retry after reminder settings fail on first load', async () => {
  reminders.getReminderPreferences.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(preferences);
  await act(async () => { tree = create(<SmartReminders />); });
  expect(notice('Reminders unavailable')).toBe(true);
  await act(async () => control('Retry reminder settings').props.onPress());
  expect(control('Enable reminders')).toBeDefined();
  expect(reminders.getReminderPreferences).toHaveBeenCalledTimes(2);
});

it('keeps an unsaved quiet-hours value after failure and an unrelated preference save', async () => {
  reminders.updateReminderPreferences.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ...preferences, snoozeMinutes: 15 });
  await act(async () => { tree = create(<SmartReminders />); });
  await act(async () => control('Quiet from (HH:MM, optional)').props.onChangeText('23:00'));
  await act(async () => control('Quiet from (HH:MM, optional)').props.onBlur());
  await act(async () => control('15 min').props.onPress());
  expect(control('Quiet from (HH:MM, optional)').props.value).toBe('23:00');
  expect(mockPrevent.mock.calls.at(-1)[0]).toBe(true);
});

it('offers Retry after reminder history fails on first load', async () => {
  reminders.getReminderInstances.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
  await act(async () => { tree = create(<ReminderInbox />); });
  expect(notice('Reminder history unavailable')).toBe(true);
  await act(async () => control('Retry reminder history').props.onPress());
  expect(reminders.getReminderInstances).toHaveBeenCalledTimes(2);
  expect(notice('Reminder history unavailable')).toBe(false);
});

it('protects plan edits and requires the sanitized saved draft before confirmation', async () => {
  const sanitized = { days: [{ weekday: 'mon', exercises: [{ exerciseId: 'squat', sets: 3, reps: '8', restSec: 90 }] }] };
  plans.updateDraft.mockResolvedValue({ plan: sanitized, warnings: [] });
  plans.confirmPlan.mockResolvedValue(undefined);
  await act(async () => { tree = create(<WorkoutPlan />); });
  await act(async () => control('More sets for squat').props.onPress());
  expect(mockPrevent.mock.calls.at(-1)[0]).toBe(true);
  expect(control('Confirm and activate plan').props.accessibilityState.disabled).toBe(true);
  await act(async () => control('Save edits').props.onPress());
  expect(mockPrevent.mock.calls.at(-1)[0]).toBe(false);
  await act(async () => control('Confirm and activate plan').props.onPress());
  expect(plans.confirmPlan).toHaveBeenCalledWith(expect.objectContaining({ plan: sanitized }));
});

it('does not offer generation while the existing plan could not be loaded', async () => {
  plans.listPlans.mockRejectedValueOnce(new Error('offline'));
  await act(async () => { tree = create(<WorkoutPlan />); });
  expect(notice('Plans unavailable')).toBe(true);
  expect(tree.root.findAllByType(Action).some(node => node.props.label === 'Generate my draft plan')).toBe(false);
  expect(control('Retry plans')).toBeDefined();
});
