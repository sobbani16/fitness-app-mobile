import { api } from './client';

// Coaching communication platform — mounted at /communication on the backend.
// Every route is feature-flagged server-side; callers get FEATURE_DISABLED
// (403) when a surface is off — treat that as unavailable, never an error UI.

export interface CoachingGroup {
  id: string;
  name: string;
  kind: 'coaching' | 'cohort' | 'challenge' | 'nutrition';
  status: string;
  myRole: 'owner' | 'moderator' | 'member';
  members: { userId: string; role: string }[];
  trainer?: { displayName: string | null; verified: boolean };
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface SharedDocument {
  id: string;
  title: string;
  category: string;
  fileName: string;
  sizeBytes: number;
  version: number;
  status: string;
  uploadedAt: string;
  trainer?: { displayName: string | null; verified: boolean };
  sharedAt?: string;
}

export interface VideoSession {
  id: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  scheduledStart: string;
  scheduledEnd: string;
  purpose: string | null;
  recordingRequested: boolean;
  roomName: string;
}

export interface JoinToken {
  token: string;
  expiresAt: string;
  provider: 'livekit' | 'humai-dev';
}

export const listGroups = () =>
  api.get<{ groups: CoachingGroup[] }>('/communication/groups').then(r => r.data.groups);

export const listGroupMessages = (groupId: string, before?: string) =>
  api.get<{ messages: GroupMessage[] }>(`/communication/groups/${groupId}/messages`, { params: { before } }).then(r => r.data.messages);

export const sendGroupMessage = (groupId: string, body: string) =>
  api.post<{ message: GroupMessage }>(`/communication/groups/${groupId}/messages`, { body }).then(r => r.data.message);

export const acceptGroupInvite = (groupId: string) =>
  api.post(`/communication/groups/${groupId}/accept`).then(r => r.data);

export const leaveGroup = (groupId: string) =>
  api.post(`/communication/groups/${groupId}/leave`).then(r => r.data);

export const listSharedDocuments = () =>
  api.get<{ documents: SharedDocument[] }>('/communication/documents/me').then(r => r.data.documents);

export const getDocumentUrl = (id: string) =>
  api.get<{ url: string; expiresInSec: number }>(`/communication/documents/${id}/url`).then(r => r.data);

export const listVideoSessions = () =>
  api.get<{ sessions: VideoSession[] }>('/communication/video-sessions').then(r => r.data.sessions);

export const joinVideoSession = (id: string) =>
  api.post<JoinToken>(`/communication/video-sessions/${id}/join`).then(r => r.data);

export const cancelVideoSession = (id: string) =>
  api.post(`/communication/video-sessions/${id}/cancel`).then(r => r.data);

export const setRecordingConsent = (id: string, granted: boolean) =>
  api.post(`/communication/video-sessions/${id}/recording-consent`, { granted }).then(r => r.data);

export const getSessionSummary = (id: string) =>
  api.get<{ summary: { memberSummary?: string; actionItems?: unknown } }>(`/communication/video-sessions/${id}/summary`).then(r => r.data.summary);
