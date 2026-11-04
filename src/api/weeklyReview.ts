import { api } from './client';

export type ReviewItem = { text: string; evidence: string };
export type WeeklyHealthReview = {
  id: string; weekOf: string; daysElapsed: number; complete: boolean; timezone: string;
  enabled: boolean; openedAt: string | null;
  goalType: string | null; summary: string;
  wentWell: ReviewItem[]; wasDifficult: ReviewItem[];
  opportunities: ReviewItem[]; nextWeekFocus: string;
  progress: Record<string, number | boolean | null>; dataCompleteness: 'good' | 'partial' | 'sparse';
  trainer: { present: boolean; displayName?: string | null; checkInStatus?: string; trainerReply?: string | null };
  relatedContent: { slug: string; category: string; title: string }[];
  note: string;
};

export async function getWeeklyReview(weekOf?: string): Promise<WeeklyHealthReview> {
  return (await api.get('/weekly-review', { params: weekOf ? { weekOf } : undefined })).data;
}
export async function getWeeklyReviewHistory(): Promise<{ weeks: { weekOf: string; openedAt: string | null }[] }> {
  return (await api.get('/weekly-review/history')).data;
}
export async function setWeeklyReviewOpt(enabled: boolean): Promise<{ enabled: boolean }> {
  return (await api.put('/weekly-review/opt', { enabled })).data;
}
export async function markWeeklyReviewOpened(weekOf: string): Promise<{ opened: boolean }> {
  return (await api.post(`/weekly-review/${weekOf}/open`)).data;
}
