import { api } from './client';
import { getDeviceId } from '../storage/device';

export interface ChatQuota {
  limit: number;
  used: number;
  remaining: number;
}

export interface ChatReply {
  topic: string;
  answer: string;
  quota: ChatQuota;
}

export async function sendChat(message: string): Promise<ChatReply> {
  const userId = await getDeviceId();
  const res = await api.post<ChatReply>(
    '/chat',
    { message },
    { headers: { 'x-user-id': userId } },
  );
  return res.data;
}

export async function getChatStatus(): Promise<ChatQuota> {
  const userId = await getDeviceId();
  const res = await api.get<ChatQuota>('/chat/status', {
    headers: { 'x-user-id': userId },
  });
  return res.data;
}
