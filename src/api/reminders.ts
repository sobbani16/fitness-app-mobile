import { api } from './client';

export interface ReminderPreferences {
  masterEnabled: boolean;
  adaptiveEnabled: boolean;
  suggestionsMuted: boolean;
  quietStart: string | null;
  quietEnd: string | null;
  dailyCap: number;
  snoozeMinutes: number;
  pausedUntil: string | null;
  weeklyDigest: boolean;
  timezone: string | null;
  timezoneLocked: boolean;
}

export interface ReminderCategorySetting {
  category: string;
  enabled: boolean;
  times: string[];
  daysOfWeek: number[] | null;
  intervalMinutes: number | null;
  leadMinutes: number | null;
  wakingStart: string | null;
  wakingEnd: string | null;
  source: string;
}

export interface ReminderSuggestion {
  id: string;
  category: string;
  title: string;
  body: string;
  proposed: { times?: string[]; daysOfWeek?: number[]; intervalMinutes?: number; supplementName?: string };
  evidence: { observations: number; dates: string[]; typicalTime?: string; pattern?: string; supplementName?: string };
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
}

export interface ReminderInstance {
  id: string;
  category: string;
  scheduledFor: string;
  status: string;
  reason: string | null;
  why: string | null;
  actedAt: string | null;
  createdAt: string;
}

export type ReminderAction = 'snooze' | 'skip' | 'complete' | 'dismiss';

export const getReminderPreferences = () => api.get<{ preferences: ReminderPreferences }>('/reminders/preferences').then(r => r.data.preferences);
export const updateReminderPreferences = (patch: Partial<ReminderPreferences>) => api.put<{ preferences: ReminderPreferences }>('/reminders/preferences', patch).then(r => r.data.preferences);
export const pauseReminders = (minutes: number | null) => api.post('/reminders/preferences/pause', { minutes }).then(r => r.data.preferences);
export const revokeAdaptive = () => api.post('/reminders/preferences/revoke-adaptive').then(r => r.data);
export const resetLearning = () => api.post('/reminders/preferences/reset-learning').then(r => r.data);
export const muteSuggestions = () => api.post('/reminders/preferences/mute-suggestions').then(r => r.data);

export const getReminderCategories = () => api.get<{ categories: ReminderCategorySetting[] }>('/reminders/categories').then(r => r.data.categories);
export const updateReminderCategory = (category: string, patch: Partial<ReminderCategorySetting>) => api.put<{ setting: ReminderCategorySetting }>(`/reminders/categories/${encodeURIComponent(category)}`, patch).then(r => r.data.setting);

export const getSuggestions = () => api.get<{ suggestions: ReminderSuggestion[] }>('/reminders/suggestions').then(r => r.data.suggestions);
export const acceptSuggestion = (id: string) => api.post(`/reminders/suggestions/${id}/accept`).then(r => r.data);
export const declineSuggestion = (id: string, mute = false) => api.post(`/reminders/suggestions/${id}/decline`, { mute }).then(r => r.data);

export const getReminderInstances = (limit = 30) => api.get<{ instances: ReminderInstance[] }>('/reminders/instances', { params: { limit } }).then(r => r.data.instances);
export const actOnInstance = (id: string, action: ReminderAction, minutes?: number) => api.post<{ instance: ReminderInstance }>(`/reminders/instances/${id}/action`, { action, minutes }).then(r => r.data.instance);

export const getReminderInbox = (limit = 30) => api.get<{ notifications: { id: string; type: string; title: string; body: string; read: boolean; createdAt: string }[] }>('/reminders/inbox', { params: { limit } }).then(r => r.data.notifications);
export const registerDevice = (deviceId: string, platform: 'ios' | 'android', expoPushToken?: string) => api.post('/reminders/devices', { deviceId, platform, expoPushToken }).then(r => r.data);
export const sendTestReminder = () => api.post('/reminders/test').then(r => r.data);
export const tickReminders = () => api.post<{ planned: number; ready: number; suppressed: number }>('/reminders/tick').then(r => r.data);
