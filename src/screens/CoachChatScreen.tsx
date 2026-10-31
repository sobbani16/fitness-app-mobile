import React, { useCallback, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  ConversationMessage,
  getMessages,
  listConversations,
  markConversationRead,
  reportConversation,
  sendMessage,
} from '../api/conversations';
import { getSession } from '../storage/session';
import { Action, Card, Copy, Field, IconAction, Notice, Skeleton } from '../design/components';
import { radius, useTheme } from '../design/theme';

const POLL_MS = 4000;
const MAX_BODY = 4000;

function mergeMessages(existing: ConversationMessage[], fresh: ConversationMessage[]): ConversationMessage[] {
  if (!fresh.length) return existing;
  const seen = new Set(existing.map((m) => m.id));
  const added = fresh.filter((m) => !seen.has(m.id));
  return added.length ? [...existing, ...added] : existing;
}

export default function CoachChatScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const conversationId: string = route.params?.conversationId;
  const name: string = route.params?.name || 'Conversation';
  const myId = getSession()?.user.id;

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [endedChecked, setEndedChecked] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [reported, setReported] = useState(false);
  const lastId = useRef<string | null>(null);

  const markRead = useCallback((newest: ConversationMessage) => {
    if (newest.senderId !== myId) {
      markConversationRead(conversationId, newest.id).catch(() => {});
    }
  }, [conversationId, myId]);

  const loadInitial = useCallback(async () => {
    setError(null);
    try {
      const [{ messages: page }, convs] = await Promise.all([
        getMessages(conversationId, { limit: 50 }),
        listConversations().catch(() => [] as Awaited<ReturnType<typeof listConversations>>),
      ]);
      setMessages(page);
      lastId.current = page.length ? page[page.length - 1].id : null;
      const conv = convs.find((c) => c.id === conversationId);
      if (conv) setEnded(conv.relationStatus !== 'active');
      setEndedChecked(true);
      if (page.length) markRead(page[page.length - 1]);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, [conversationId, markRead]);

  const poll = useCallback(async () => {
    try {
      const { messages: fresh } = await getMessages(conversationId, lastId.current ? { after: lastId.current } : {});
      if (!fresh.length) return;
      lastId.current = fresh[fresh.length - 1].id;
      setMessages((prev) => mergeMessages(prev, fresh));
      markRead(fresh[fresh.length - 1]);
    } catch { /* polling stays silent — next tick retries */ }
  }, [conversationId, markRead]);

  useFocusEffect(useCallback(() => {
    void loadInitial();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(timer);
  }, [loadInitial, poll]));

  const send = async () => {
    const body = input.trim();
    if (!body || sending || ended) return;
    setSending(true);
    setSendError(null);
    try {
      const message = await sendMessage(conversationId, body.slice(0, MAX_BODY));
      lastId.current = message.id;
      setMessages((prev) => mergeMessages(prev, [message]));
      setInput('');
    } catch (e: any) {
      const status = e.response?.status;
      if (status === 403) setEnded(true);
      setSendError(status === 403
        ? 'This coaching relationship has ended — the conversation is now read-only.'
        : e.response?.data?.error || e.message || 'The message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const report = async () => {
    try {
      await reportConversation(conversationId);
      setReported(true);
    } catch (e: any) {
      setSendError(e.response?.data?.error || e.message || 'The report could not be sent.');
    }
  };

  const data = [...messages].reverse();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <FlatList
        inverted
        data={loading ? [] : data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ gap: 8 }}>
            {!!sendError && <Card><Notice error title="Message problem" message={sendError} /></Card>}
            {ended && endedChecked && (
              <Card><Notice title="Conversation archived"
                message="The coaching relationship has ended. You can read this history, but no new messages can be sent." /></Card>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label={`Message ${name}`} value={input} onChangeText={setInput} maxLength={MAX_BODY}
                  editable={!ended && !sending} placeholder={ended ? 'Conversation is read-only' : 'Write a message…'}
                  multiline submitBehavior="submit" onSubmitEditing={() => void send()} returnKeyType="send" />
              </View>
              <View style={{ justifyContent: 'flex-end', paddingBottom: 4 }}>
                <IconAction icon="➤" label={sending ? 'Sending message' : 'Send message'} disabled={sending || ended || !input.trim()} onPress={() => void send()} />
              </View>
            </View>
          </View>
        }
        ListFooterComponent={
          <View style={{ gap: 8, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Copy size="heading" accessibilityRole="header" style={{ flex: 1 }}>{name}</Copy>
              {!reported && <IconAction icon="⚑" label={`Report conversation with ${name}`} onPress={() => void report()} />}
              {reported && <Copy size="caption" tone="muted">Reported</Copy>}
            </View>
            {loading && <Skeleton label="Loading messages" />}
            {!!error && !loading && (
              <Card><Notice error title="Could not load messages" message={error} /><Action label="Retry" onPress={() => { setLoading(true); void loadInitial(); }} /></Card>
            )}
            {!loading && !error && messages.length === 0 && (
              <Copy tone="muted" style={{ textAlign: 'center' }}>No messages yet — say hello.</Copy>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const mine = item.senderId === myId;
          return (
            <View style={{
              alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%',
              backgroundColor: mine ? colors.primary : colors.surface,
              borderWidth: mine ? 0 : 1, borderColor: colors.border,
              borderRadius: radius.control, paddingHorizontal: 12, paddingVertical: 8,
            }}
              accessibilityLabel={`${mine ? 'You' : name}: ${item.body}`}>
              <Copy selectable style={{ color: mine ? colors.onPrimary : colors.text }}>{item.body}</Copy>
              <Copy size="caption" style={{ color: mine ? colors.onPrimary : colors.muted, opacity: 0.8, alignSelf: 'flex-end' }}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Copy>
            </View>
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}
