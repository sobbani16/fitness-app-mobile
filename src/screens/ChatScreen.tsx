import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { getChatStatus, sendChat, ChatQuota } from '../api/chat';

interface Msg {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
}

const SUGGESTIONS = [
  'How much protein should I eat?',
  'What cardio should I do this week?',
  'Is my calorie deficit right?',
  'Tips for better sleep?',
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text:
        "Hi! Ask me about calories, protein, cardio, strength, sleep, or hydration. You get 5 questions per day.",
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [quota, setQuota] = useState<ChatQuota | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    getChatStatus().then(setQuota).catch(() => {});
  }, []);

  const scrollToEnd = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const onSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    scrollToEnd();
    try {
      const reply = await sendChat(text);
      setQuota(reply.quota);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', text: reply.answer },
      ]);
    } catch (e: any) {
      let msg = 'Something went wrong.';
      if (axios.isAxiosError(e) && e.response?.status === 429) {
        msg = "You've reached today's 5-question limit. Try again tomorrow.";
        if (e.response.data) setQuota({ limit: 5, used: 5, remaining: 0 });
      } else if (e?.message) {
        msg = e.message;
      }
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'system', text: msg }]);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  };

  const canSend = !sending && input.trim().length > 0 && (quota?.remaining ?? 1) > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <Text style={styles.muted}>
          {quota ? `${quota.remaining}/${quota.limit} left today` : '…'}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.messages}
        onContentSizeChange={scrollToEnd}
      >
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              m.role === 'user' && styles.bubbleUser,
              m.role === 'assistant' && styles.bubbleAssistant,
              m.role === 'system' && styles.bubbleSystem,
            ]}
          >
            <Text style={m.role === 'user' ? styles.bubbleTextUser : styles.bubbleText}>
              {m.text}
            </Text>
          </View>
        ))}
        {sending && <ActivityIndicator style={{ marginTop: 8 }} />}

        {messages.length <= 1 && (
          <View style={styles.suggestions}>
            <Text style={styles.muted}>Try asking:</Text>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} style={styles.chip} onPress={() => onSend(s)}>
                <Text style={styles.chipText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={
            quota && quota.remaining === 0
              ? 'Daily limit reached'
              : 'Ask a fitness question…'
          }
          editable={!(quota && quota.remaining === 0)}
          onSubmitEditing={() => onSend()}
          returnKeyType="send"
        />
        <Pressable
          onPress={() => onSend()}
          disabled={!canSend}
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: { fontSize: 22, fontWeight: '700' },
  muted: { color: '#666' },
  messages: { padding: 16, gap: 8, paddingBottom: 24 },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#1e6fb8',
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef0f3',
  },
  bubbleSystem: {
    alignSelf: 'center',
    backgroundColor: '#fdecec',
    borderWidth: 1,
    borderColor: '#f5c2c2',
  },
  bubbleText: { color: '#111', lineHeight: 20 },
  bubbleTextUser: { color: '#fff', lineHeight: 20 },
  suggestions: { marginTop: 12, gap: 6 },
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#d0d0d5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  chipText: { color: '#222' },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d0d0d5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  sendBtn: {
    backgroundColor: '#1e6fb8',
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 20,
  },
  sendBtnDisabled: { backgroundColor: '#a8bfd4' },
  sendBtnText: { color: '#fff', fontWeight: '700' },
});
