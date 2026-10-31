import { api } from './client';
import { getDeviceId } from '../storage/device';

export interface VoiceAction {
  intent: string;
  entities: any;
  missing: string[];
  segment: string;
  status: 'ready' | 'needs_review';
  matches?: { id: string; name: string }[];
}

export interface VoiceContext { lastExercise?: string; lastWeight?: number; lastSetId?: string; weightUnit?: string; }

const headers = async () => ({ 'x-user-id': await getDeviceId() });

export const transcribeVoice = async (audio: string, format = 'm4a') =>
  (await api.post<{ transcript: string }>('/voice/transcribe',
    { audio, format }, { headers: await headers() })).data;

export const interpretVoice = async (transcript: string, context?: VoiceContext) =>
  (await api.post<{ transcript: string; actions: VoiceAction[] }>('/voice/interpret',
    { transcript, context }, { headers: await headers() })).data;

export const executeVoice = async (commandId: string, transcript: string, actions: VoiceAction[]) =>
  (await api.post<{ commandId: string; result: { intent: string; status: string; detail?: string; reason?: string }[] }>(
    '/voice/commands/execute', { commandId, transcript, actions }, { headers: await headers() })).data;

export const undoVoice = async (commandId: string) =>
  (await api.post('/voice/commands/undo', { commandId }, { headers: await headers() })).data;

export const newCommandId = () => `vc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
