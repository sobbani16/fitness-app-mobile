import React, { useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation, usePreventRemove, useRoute } from '@react-navigation/native';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import FeedbackAttachment from '../components/FeedbackAttachment';
import { Action, Card, Copy, Field, Notice } from '../design/components';
import { useTheme } from '../design/theme';
import { composeFeedback, feedbackScreen, FeedbackKind, redactFeedback } from '../services/feedback';
export default function FeedbackScreen() {
  const { colors } = useTheme(), route = useRoute<any>(), navigation = useNavigation();
  const [kind, setKind] = useState<FeedbackKind>('Bug report'), [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null), [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [status, setStatus] = useState('');
  const lock = useRef(false), handedOff = useRef(false);
  const source = typeof route.params?.source === 'string' ? route.params.source : undefined;
  usePreventRemove(busy || !!message.trim() || !!attachment, ({ data }) => {
    if (lock.current) return;
    if (handedOff.current) { navigation.dispatch(data.action); return; }
    Alert.alert('Discard feedback draft?', 'This draft is only kept while this screen is open.', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) }]);
  });
  const changed = () => { setReviewed(false); setStatus(''); handedOff.current = false; };
  const send = async () => {
    if (lock.current || !reviewed || !message.trim()) return;
    lock.current = true; setBusy(true); setError('');
    try { const result = await composeFeedback(kind, source, message, attachment || undefined); setStatus(result.message); handedOff.current = result.completed; setReviewed(false); }
    catch (e: any) { setError(e.message || 'Could not open your email app. Your draft is still here.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
    <Copy size="title" accessibilityRole="header">Help improve Humai</Copy>
    <Copy tone="muted">Your feedback opens an email draft for you to send. We do not send it automatically or upload your logs.</Copy>
    <Card><Copy>About: {feedbackScreen(source)}</Copy><View style={{ gap: 8 }}>{(['Bug report', 'Feature suggestion', 'General feedback'] as FeedbackKind[]).map(value => <Action key={value} label={value} selected={kind === value} secondary={kind !== value} disabled={busy} onPress={() => { setKind(value); changed(); }} />)}</View>
      <Field label="What would you like us to know?" value={message} multiline maxLength={4000} editable={!busy} onChangeText={value => { setMessage(value); changed(); }} placeholder="What happened, what you expected, and how to reproduce it. Leave out private health details." />
      <Copy tone="muted">{message.length}/4000 characters. Do not include passwords, names, health records or private conversations.</Copy>
    </Card>
    <Card><FeedbackAttachment disabled={busy} onChange={uri => { setAttachment(uri); changed(); }} />{attachment && <Copy>Reviewed screenshot selected for attachment.</Copy>}</Card>
    <Card><Copy size="heading">Review what will be included</Copy><Copy>Type: {kind} · Screen: {feedbackScreen(source)}</Copy>
      <Copy selectable>{redactFeedback(message) || 'Your feedback preview appears here.'}</Copy>
      <Copy tone="muted">Common credentials, contact details and measurement patterns are redacted. This cannot detect every private detail; review the text and image yourself. Only the screen name and platform are added, never your profile, health logs or chat history.</Copy>
      <Action secondary label={reviewed ? '✓ Reviewed; no private information' : 'I reviewed the text and image for private information'} selected={reviewed} disabled={busy || !message.trim()} onPress={() => setReviewed(v => !v)} />
      <Action label={busy ? 'Opening email…' : 'Open email draft'} disabled={busy || !reviewed || !message.trim()} onPress={() => void send()} />
    </Card>
    {!!error && <Notice title="Feedback not sent" message={error} error />}
    {!!status && <Notice title="Email handoff" message={status} />}
  </KeyboardAwareScrollView>;
}
