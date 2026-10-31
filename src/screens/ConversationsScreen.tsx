import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Conversation,
  listConversations,
  openConversationWithClient,
  openConversationWithTrainer,
} from '../api/conversations';
import { getAssignedTrainer, getMyClients, TrainerClient } from '../api/trainers';
import { useRoles } from '../context/RolesContext';
import { Action, Card, Copy, ListRow, Notice, Sheet, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Avatar from '../components/Avatar';
import Chip from '../components/Chip';
import EmptyState from '../components/ui-states/EmptyState';

type ClientRow = TrainerClient & { clientName?: string };

function previewText(c: Conversation): string {
  const body = c.lastMessage?.body?.trim();
  return body ? (body.length > 80 ? `${body.slice(0, 80)}…` : body) : 'No messages yet';
}

export default function ConversationsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { hasRole } = useRoles();
  const isTrainer = hasRole('TRAINER');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [trainer, setTrainer] = useState<(TrainerClient & { trainer: { id: string; displayName: string | null } }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await listConversations();
      setConversations(list);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Could not load conversations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadContext = useCallback(async () => {
    if (isTrainer) {
      try {
        const data = await getMyClients();
        const rows = (data.clients || []) as ClientRow[];
        setClients(rows);
        setClientNames(Object.fromEntries(rows.filter((c) => c.clientName).map((c) => [c.clientId, c.clientName!])));
      } catch { /* names fall back to 'Client' */ }
    } else {
      try {
        const data = await getAssignedTrainer();
        setTrainer(data.assigned as typeof trainer);
      } catch { /* no assigned trainer */ }
    }
  }, [isTrainer]);

  useFocusEffect(useCallback(() => {
    void load();
    void loadContext();
  }, [load, loadContext]));

  const nameFor = (c: Conversation): string => {
    if (c.participantName) return c.participantName;
    if (c.role === 'client') return c.trainer?.displayName || 'Your coach';
    return (c.clientId && clientNames[c.clientId]) || 'Client';
  };

  const openChat = (conversationId: string, name: string) => {
    navigation.navigate('CoachChat', { conversationId, name });
  };

  const startWithClient = async (client: ClientRow) => {
    setActionError(null);
    try {
      const conversation = await openConversationWithClient(client.clientId);
      setPickerOpen(false);
      openChat(conversation.id, client.clientName || 'Client');
    } catch (e: any) {
      setActionError(e.response?.data?.error || e.message || 'Could not start the conversation.');
    }
  };

  const startWithTrainer = async () => {
    if (!trainer) return;
    setActionError(null);
    try {
      const conversation = await openConversationWithTrainer(trainer.trainer.id);
      openChat(conversation.id, trainer.trainer.displayName || 'Your coach');
    } catch (e: any) {
      setActionError(e.response?.data?.error || e.message || 'Could not start the conversation.');
    }
  };

  const activeClients = clients.filter((c) => c.status === 'active');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={loading ? [] : conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Messages</Copy>
            <Copy tone="muted">Direct messages between you and {isTrainer ? 'your clients' : 'your coach'}.</Copy>
            {isTrainer && activeClients.length > 0 && (
              <Action secondary label="Start a conversation" onPress={() => setPickerOpen(true)} />
            )}
            {!isTrainer && trainer && (
              <Action secondary label={`Message ${trainer.trainer.displayName || 'your coach'}`} onPress={() => void startWithTrainer()} />
            )}
            {!!actionError && <Card><Notice error title="Could not start conversation" message={actionError} /></Card>}
            {!!error && !loading && (
              <Card><Notice error title="Could not load messages" message={error} /><Action label="Retry" onPress={() => void load()} /></Card>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? <Skeleton label="Loading conversations" /> : error ? null : (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState title="No conversations yet"
                description={isTrainer ? 'Pick an active client to start messaging.' : 'When your coach messages you it will appear here.'} />
            </View>
          )
        }
        renderItem={({ item }) => {
          const name = nameFor(item);
          const ended = item.relationStatus !== 'active';
          return (
            <Card style={{ padding: 14 }}>
              <ListRow title={name} subtitle={previewText(item)} onPress={() => openChat(item.id, name)}>
                <Avatar name={name} uri={item.role === 'client' ? item.trainer?.profilePicture : null} size={44} />
                {ended && <Chip small label="Ended" accessibilityLabel="Coaching relationship ended" />}
                {item.unreadCount > 0 && (
                  <View accessibilityLabel={`${item.unreadCount} unread messages`}
                    style={{ minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 }}>
                    <Copy size="caption" style={{ color: colors.onPrimary, fontWeight: '700' }}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Copy>
                  </View>
                )}
              </ListRow>
            </Card>
          );
        }}
      />

      <Sheet visible={pickerOpen} title="Message a client" onClose={() => setPickerOpen(false)}>
        {activeClients.length === 0 && <Copy tone="muted">No active clients to message.</Copy>}
        {activeClients.map((c) => (
          <ListRow key={c.id} title={c.clientName || 'Client'} subtitle={`${c.daysWithTrainer ?? 0} days with you`}
            onPress={() => void startWithClient(c)} />
        ))}
      </Sheet>
    </View>
  );
}
