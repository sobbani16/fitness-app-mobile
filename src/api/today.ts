import { api } from './client';

export type TodayAction = {
  id: string;
  actionKey: string;
  title: string;
  explanation?: string;
  evidence?: string[];
  action?: { type: string; route?: string; params?: Record<string, string> };
  confidence?: 'high' | 'partial' | 'low';
};

export type TodayActionsResponse = {
  version: string;
  date: string;
  timezone: string;
  actions: TodayAction[];
  suppressed: number;
  note?: string;
};

export async function getTodayActions(): Promise<TodayActionsResponse> {
  const res = await api.get<TodayActionsResponse>('/today/actions');
  return res.data;
}

export async function sendActionFeedback(actionKey: string, verdict: string): Promise<void> {
  await api.post('/today/actions/feedback', { actionKey, verdict });
}
