import { api } from './client';
import * as FileSystem from 'expo-file-system/legacy';

export type FormCheckFeedback = { id: string; timestampSec: number | null; note: string; createdAt: string };
export type FormCheckRequest = {
  id: string; relationId: string; exerciseKey: string | null; exerciseName: string | null;
  note: string | null; status: 'requested' | 'submitted' | 'reviewed' | 'declined' | 'acknowledged';
  videoName: string | null; videoMime: string | null; videoBytes: number | null;
  submittedAt: string | null; reviewedAt: string | null; memberAckAt: string | null;
  feedback: FormCheckFeedback[]; createdAt: string;
};

export async function listMyFormChecks(): Promise<{ requests: FormCheckRequest[] }> {
  return (await api.get('/form-checks/mine')).data;
}
export async function listTrainerFormChecks(clientId?: string): Promise<{ requests: FormCheckRequest[] }> {
  return (await api.get('/form-checks/trainer', { params: clientId ? { clientId } : undefined })).data;
}
export async function createFormCheck(relationId: string, body: { exerciseName?: string; exerciseKey?: string; note?: string }) {
  return (await api.post('/form-checks', { relationId, ...body })).data;
}
export async function declineFormCheck(id: string) { return (await api.post(`/form-checks/${id}/decline`)).data; }
export async function acknowledgeFormCheck(id: string) { return (await api.post(`/form-checks/${id}/acknowledge`)).data; }
export async function addFormCheckFeedback(id: string, body: { timestampSec?: number; note: string }) {
  return (await api.post(`/form-checks/${id}/feedback`, body)).data;
}
export async function getFormCheckVideoUrl(id: string): Promise<{ url: string; expiresInSec: number }> {
  return (await api.get(`/form-checks/${id}/video-url`)).data;
}
// Member uploads the clip — explicit consentToTrainerReview is required by the
// backend. Server accepts JSON {dataBase64} (bounded ~8MB) or raw bytes; the
// JSON path is what the app supports today.
export async function uploadFormCheckVideo(id: string, asset: { uri: string; fileName?: string | null; mimeType?: string | null }) {
  const name = asset.fileName || 'form-check.mp4';
  const dataBase64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
  return (await api.post(`/form-checks/${id}/video`, {
    dataBase64, fileName: name, consentToTrainerReview: true,
  })).data;
}
