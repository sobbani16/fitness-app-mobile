import ReleaseLinks from './ReleaseLinks';
import React, { useRef, useState } from 'react';
import { View, Alert } from 'react-native';
import { Action, Copy, Field } from '../design/components';
import LegacyMigrationGate from './LegacyMigrationGate';
import { removeAccount, shareAccountExport } from '../services/accountLifecycle';

export default function AccountPrivacy() {
  const [restoring, setRestoring] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const [message, setMessage] = useState('');
  async function run(action: () => Promise<void>) {
    if (active.current) return;
    active.current = true; setBusy(true); setMessage('');
    try { await action(); }
    catch (e: any) { setMessage(e.response?.data?.error || e.message || 'Unable to continue. Please try again.'); }
    finally { active.current = false; setBusy(false); setPassword(''); }
  }
  function confirmDeletion() {
    Alert.alert('Permanently delete your account?', 'This removes your health data, sessions, recipes, and coaching relationships and plans. There is no undo. Export your data first if you want a copy.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete permanently', style: 'destructive', onPress: () => run(() => removeAccount(password, confirmation)) },
    ]);
  }
  return <View style={{ gap: 12 }}>
    <ReleaseLinks />
    <Action label={expanded ? 'Close account privacy' : 'Account privacy: export or delete'} disabled={busy} onPress={() => { setExpanded(!expanded); setPassword(''); setConfirmation(''); setMessage(''); }} />
    {expanded && <>
      <Action label="Restore an old device account" disabled={busy} onPress={() => setRestoring(!restoring)} />
      {restoring && <LegacyMigrationGate manual>{null}</LegacyMigrationGate>}
      <Copy size="heading">Your account and data</Copy>
      <Copy>Export your account data and this device’s saved records as a JSON file. The export contains sensitive health information; choose a trusted destination.</Copy>
      <Copy>Deletion removes live account data immediately and signs you out. Coaching assignments, plans and notes involving your account are also removed. Shared food catalogs and other members’ independent health records remain.</Copy>
      <Copy>Saved exports, offline devices and external provider copies are not remotely erased. Backup and log retention is subject to the service’s hosting policy; the release target is at most 30 days.</Copy>
      <Field label="Current password for account privacy" placeholder="Current password" secureTextEntry autoComplete="current-password" autoCapitalize="none" value={password} onChangeText={setPassword} editable={!busy} />
      <Action label="Export my data" disabled={busy || !password} onPress={() => run(async () => { await shareAccountExport(password); setMessage('Export share sheet closed. Keep any copy you saved secure.'); })} />
      <Field label="Type DELETE to confirm" placeholder="Type DELETE to confirm" value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" autoCorrect={false} editable={!busy} />
      <Action label="Delete my account" disabled={busy || !password || confirmation !== 'DELETE'} onPress={confirmDeletion} />
      {busy && <Copy>Please wait…</Copy>}
      {!!message && <Copy accessibilityRole="alert">{message}</Copy>}
    </>}
  </View>;
}
