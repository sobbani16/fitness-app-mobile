import { api } from './client';
import { getDeviceId } from '../storage/device';

// ---------------------------------------------------------------------------
// Trainer↔client messaging — mounted at /conversations. Conversations are
// keyed to the trainer-client relation; ended relations are read-only.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}

export interface ConversationTrainerRef {
  id: string;
  userId: string;
  displayName: string | null;
  profilePicture: string | null;
}

export interface Conversation {
  id: string;
  relationId: string;
  createdAt: string;
  updatedAt: string;
  /** Caller's role in the relation. */
  role: 'client' | 'trainer';
  /** Relation status — 'active' or an ended state (read-only archive). */
  relationStatus: string;
  trainer?: ConversationTrainerRef;
  clientId?: string;
  /** Optional denormalized peer name when the backend provides it. */
  participantName?: string | null;
  lastMessage?: ConversationMessage | null;
  unreadCount: number;
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

async function authHeaders() {
  const userId = await getDeviceId();
  return { 'x-user-id': userId };
}

export async function listConversations(): Promise<Conversation[]> {
  const headers = await authHeaders();
  const res = await api.get<{ conversations: Conversation[] }>('/conversations', { headers });
  return res.data.conversations;
}

export async function getUnreadCount(): Promise<number> {
  const headers = await authHeaders();
  const res = await api.get<{ count: number }>('/conversations/unread-count', { headers });
  return res.data.count;
}

/** Trainer: find-or-create the 1:1 conversation with a client (user id). */
export async function openConversationWithClient(clientId: string): Promise<Conversation> {
  const headers = await authHeaders();
  const res = await api.post<{ conversation: Conversation }>(`/conversations/with/${encodeURIComponent(clientId)}`, {}, { headers });
  return res.data.conversation;
}

/** Client: find-or-create the 1:1 conversation with a trainer (profile id). */
export async function openConversationWithTrainer(trainerId: string): Promise<Conversation> {
  const headers = await authHeaders();
  const res = await api.post<{ conversation: Conversation }>(`/conversations/with-trainer/${encodeURIComponent(trainerId)}`, {}, { headers });
  return res.data.conversation;
}

/** History page, oldest→newest. `after` = last seen message id (asc cursor). */
export async function getMessages(
  conversationId: string,
  options: { after?: string; limit?: number } = {},
): Promise<{ messages: ConversationMessage[]; nextCursor: string | null }> {
  const headers = await authHeaders();
  const params: Record<string, string | number> = {};
  if (options.after) params.after = options.after;
  if (options.limit) params.limit = options.limit;
  const res = await api.get<{ messages: ConversationMessage[]; nextCursor: string | null }>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    { headers, params },
  );
  return res.data;
}

export async function sendMessage(conversationId: string, body: string): Promise<ConversationMessage> {
  const headers = await authHeaders();
  const res = await api.post<{ message: ConversationMessage }>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    { body },
    { headers },
  );
  return res.data.message;
}

/** Mark everything the peer sent, up to and including lastMessageId, as read. */
export async function markConversationRead(conversationId: string, lastMessageId: string): Promise<number> {
  const headers = await authHeaders();
  const res = await api.post<{ markedRead: number }>(
    `/conversations/${encodeURIComponent(conversationId)}/read`,
    { lastMessageId },
    { headers },
  );
  return res.data.markedRead;
}

export async function reportConversation(conversationId: string): Promise<void> {
  const headers = await authHeaders();
  await api.post(`/conversations/${encodeURIComponent(conversationId)}/report`, {}, { headers });
}
