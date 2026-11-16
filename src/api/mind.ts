import { api } from './client';

// ---- Mind & Habits ---------------------------------------------------------
export type Mood = 'very_low' | 'low' | 'neutral' | 'good' | 'very_good';
export type EmotionalCheckIn = {
  id: string; mood: Mood; energy: number; stress: number;
  emotionTags: string[]; contextTags: string[]; journal: string | null;
  loggedAt: string; timezone: string;
};
export type MindPreferences = {
  moduleEnabled: boolean; remindersEnabled: boolean;
  aiJournalConsent: boolean; checkinSharingConsent: boolean;
  reminderTimeLocal?: string | null; reminderTimeZone?: string | null;
  reminderPaused?: boolean; quietHoursStart?: string | null; quietHoursEnd?: string | null;
};
export type Track = { key: string; title: string; description: string; lessonCount: number; lessons: { key: string; title: string }[] };
export type TrackDetail = { key: string; title: string; description: string; attribution: string; lessons: { key: string; title: string; body: string; exercise: string; completed: boolean }[] };
export type GuidedExercise = { key: string; trackKey: string; title: string; durationSec: number; steps: string[] };
export type MindInsights = { checkinCount: number; minObservations: number; dataQuality: 'ok' | 'insufficient'; insights: { type: string; statement: string; sampleSize: number; causal: false }[]; attribution: string };

export const getMindPreferences = () => api.get('/mind/preferences').then((r) => r.data.preferences as Promise<MindPreferences>);
export const updateReminderPrefs = (patch: Partial<MindPreferences>) => api.put('/mind/reminders', patch).then((r) => r.data.preferences as Promise<MindPreferences>);
export const updateMindPreferences = (patch: Partial<MindPreferences>) => api.put('/mind/preferences', patch).then((r) => r.data.preferences as Promise<MindPreferences>);
export const createCheckIn = (body: Partial<EmotionalCheckIn>) => api.post('/mind/check-ins', body).then((r) => r.data.checkin as Promise<EmotionalCheckIn>);
export const listCheckIns = (days = 30) => api.get('/mind/check-ins', { params: { days } }).then((r) => r.data.checkins as Promise<EmotionalCheckIn[]>);
export const updateCheckIn = (id: string, body: Partial<EmotionalCheckIn>) => api.patch(`/mind/check-ins/${id}`, body).then((r) => r.data.checkin as Promise<EmotionalCheckIn>);
export const deleteCheckIn = (id: string) => api.delete(`/mind/check-ins/${id}`);
export const listTracks = () => api.get('/mind/tracks').then((r) => r.data.tracks as Promise<Track[]>);
export const getTrack = (key: string) => api.get(`/mind/tracks/${key}`).then((r) => r.data.track as Promise<TrackDetail>);
export const listExercises = () => api.get('/mind/exercises').then((r) => r.data.exercises as Promise<GuidedExercise[]>);
export const completeExercise = (key: string, reflection?: string) => api.post(`/mind/exercises/${key}/complete`, { reflection }).then((r) => r.data.completion);
export const getMindInsights = (days = 30) => api.get('/mind/insights', { params: { days } }).then((r) => r.data as Promise<MindInsights>);
export const leoMind = (text: string) => api.post('/mind/leo', { text }).then((r) => r.data as Promise<{ crisis: boolean; message?: string; suggestions: { action: string; label: string; exerciseKey?: string }[] }>);
