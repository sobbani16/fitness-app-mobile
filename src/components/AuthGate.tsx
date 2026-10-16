import ReleaseLinks from './ReleaseLinks';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, View, Text, TextInput, Button, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { api } from '../api/client';
import { getSession, loadSession, saveSession, subscribeSession, Session } from '../storage/session';

import { purgeAccountCache } from '../storage/accountStorage';
import LegacyMigrationGate from './LegacyMigrationGate';
import AccountPrivacy from './AccountPrivacy';
import { clearTemporaryExports, resumeAccountCleanup } from '../services/accountLifecycle';

type Mode = 'login' | 'register' | 'forgot';
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<Mode>('login');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function refreshVerification() {
    const current = getSession();
    if (!current) return;
    try {
      const { data } = await api.get<{ user: Session['user'] }>('/auth/me');
      if (getSession()?.token !== current.token) return;
      await saveSession({ ...current, user: data.user });
      if (!data.user.emailVerifiedAt) setMessage('Your email is not verified yet. Open the email link, then check again.');
    } catch (e: any) {
      if (getSession()?.token !== current.token) return;
      if (e.response?.status === 401) { await purgeAccountCache(current.user.id); await saveSession(null); }
      else throw e;
    }
  }
  useEffect(() => {
    const off = subscribeSession(() => { setSession(getSession()); setError(''); setMessage(''); });
    loadSession().then(async saved => {
      clearTemporaryExports();
      await resumeAccountCleanup();
      saved = getSession();
      setSession(saved);
      await refreshVerification();
    }).catch(() => setError('Unable to check your account. Check your connection and try again.')).finally(() => setLoading(false));
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') refreshVerification().catch(() => setError('Unable to check verification. Please try again.'));
    });
    return () => { off(); listener.remove(); };
  }, []);

  async function perform(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setMessage('');
    try { await action(); }
    catch (e: any) { setError(e.response?.data?.error || 'Unable to continue. Check your connection and try again.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function submit() {
    await perform(async () => {
      const normalized = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) { setError('Enter a valid email address.'); return; }
      if (mode === 'forgot') {
        const { data } = await api.post('/auth/forgot-password', { email: normalized });
        setMessage(data.message); return;
      }
      const { data } = await api.post<Session>(mode === 'register' ? '/auth/register' : '/auth/login', { email: normalized, password });
      await saveSession(data); setPassword('');
    });
  }
  function switchMode(next: Mode) { setMode(next); setPassword(''); setError(''); setMessage(''); }
  if (loading) return <View style={styles.center}><ActivityIndicator accessibilityLabel="Checking account" /></View>;
  if (session?.user.emailVerifiedAt) return <React.Fragment key={session.user.id}><LegacyMigrationGate>{children}</LegacyMigrationGate></React.Fragment>;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{session ? 'Verify your email' : mode === 'register' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}</Text>
      {session ? <>
        <Text>Open the verification email sent to {session.user.email} and confirm your address. Then return here to continue.</Text>
        <Button title="I’ve verified my email" disabled={busy} onPress={() => perform(refreshVerification)} />
        <Button title="Resend verification email" disabled={busy} onPress={() => perform(async () => {
          const { data } = await api.post('/auth/resend-verification', { email: session.user.email }); setMessage(data.message);
        })} />
        <Button title="Sign out" disabled={busy} onPress={() => perform(async () => {
          await api.post('/auth/logout').catch((e: any) => { if (e.response?.status !== 401) throw e; });
          await saveSession(null); switchMode('login');
        })} />
        <AccountPrivacy />
      </> : <>
        {mode === 'forgot' && <Text>We’ll email you a link to choose a new password. The link expires in 30 minutes.</Text>}
        <TextInput accessibilityLabel="Email" style={styles.input} value={email} onChangeText={setEmail} editable={!busy} placeholder="Email" autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" maxLength={254} />
        {mode !== 'forgot' && <TextInput accessibilityLabel="Password" style={styles.input} value={password} onChangeText={setPassword} editable={!busy} placeholder="Password (at least 12 characters)" secureTextEntry autoCapitalize="none" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} maxLength={128} />}
        <Button title={busy ? 'Please wait…' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'} disabled={busy} onPress={submit} />
        {mode === 'login' && <Button title="Forgot password?" disabled={busy} onPress={() => switchMode('forgot')} />}
        <Button title={mode === 'login' ? 'Create an account' : 'Back to sign in'} disabled={busy} onPress={() => switchMode(mode === 'login' ? 'register' : 'login')} />
      </>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
      {busy && <ActivityIndicator accessibilityLabel="Please wait" />}
      <ReleaseLinks />
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 26, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#aaa', borderRadius: 8, padding: 14 },
  error: { color: '#b42318' },
});
