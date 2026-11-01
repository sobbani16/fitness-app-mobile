import React, { useCallback, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { GroupMessage, listGroupMessages, sendGroupMessage } from '../api/communication';
import { Action, Copy, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import EmptyState from '../components/ui-states/EmptyState';
import { getSession } from '../storage/session';

export default function GroupChatScreen({ route }: any) {
  const { colors } = useTheme();
  const { groupId } = route.params as { groupId: string; name?: string };
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const myId = getSession()?.user.id;
  const list = useRef<FlatList<GroupMessage>>(null);

  const load = useCallback(async () => {
    try {
      setMessages(await listGroupMessages(groupId));
      setError(null);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(useCallback(() => {
    void load();
    const t = setInterval(() => void load(), 15000); // light polling; push lands separately
    return () => clearInterval(t);
  }, [load]));

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const msg = await sendGroupMessage(groupId, body);
      setMessages(m => [...m, msg]);
      setDraft('');
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Send failed.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}><Skeleton /></View>;
  if (error && !messages.length) return <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}><EmptyState title="Couldn't open group" description={error} /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={list}
        contentContainerStyle={{ padding: 16, gap: 6 }}
        data={messages}
        keyExtractor={m => m.id}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<EmptyState title="No messages" description="Say hello to the group." />}
        renderItem={({ item }) => {
          const mine = item.senderId === myId;
          return (
            <View style={{
              alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%',
              backgroundColor: mine ? colors.primary : colors.surface,
              borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
            }}>
              <Copy  style={{ color: mine ? colors.onPrimary : colors.text }}>{item.body}</Copy>
              <Copy size="caption" style={{ color: mine ? colors.onPrimary : colors.muted, marginTop: 2 }}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Copy>
            </View>
          );
        }}
      />
      <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, color: colors.text }}
          placeholder="Message…" placeholderTextColor={colors.muted}
          value={draft} onChangeText={setDraft} maxLength={4000} multiline
        />
        <Action label="Send" onPress={send} disabled={sending || !draft.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}
