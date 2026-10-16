import ReleaseLinks from './ReleaseLinks';
import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
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
  return <View style={styles.container}>
    <ReleaseLinks />
    <Button title={expanded ? 'Close account privacy' : 'Account privacy: export or delete'} disabled={busy} onPress={() => { setExpanded(!expanded); setPassword(''); setConfirmation(''); setMessage(''); }} />
    {expanded && <>
      <Button title="Restore an old device account" disabled={busy} onPress={() => setRestoring(!restoring)} />
      {restoring && <LegacyMigrationGate manual>{null}</LegacyMigrationGate>}
      <Text style={styles.title}>Your account and data</Text>
      <Text>Export your account data and this device’s saved records as a JSON file. The export contains sensitive health information; choose a trusted destination.</Text>
      <Text>Deletion removes live account data immediately and signs you out. Coaching assignments, plans and notes involving your account are also removed. Shared food catalogs and other members’ independent health records remain.</Text>
      <Text>Saved exports, offline devices and external provider copies are not remotely erased. Backup and log retention is subject to the service’s hosting policy; the release target is at most 30 days.</Text>
      <TextInput accessibilityLabel="Current password for account privacy" placeholder="Current password" secureTextEntry autoComplete="current-password" autoCapitalize="none" value={password} onChangeText={setPassword} editable={!busy} style={styles.input} />
      <Button title="Export my data" disabled={busy || !password} onPress={() => run(async () => { await shareAccountExport(password); setMessage('Export share sheet closed. Keep any copy you saved secure.'); })} />
      <TextInput accessibilityLabel="Type DELETE to confirm" placeholder="Type DELETE to confirm" value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" autoCorrect={false} editable={!busy} style={styles.input} />
      <Button title="Delete my account" color="#b42318" disabled={busy || !password || confirmation !== 'DELETE'} onPress={confirmDeletion} />
      {busy && <Text>Please wait…</Text>}
      {!!message && <Text accessibilityRole="alert">{message}</Text>}
    </>}
  </View>;
}
const styles = StyleSheet.create({ container: { paddingVertical: 16, gap: 12 }, title: { fontSize: 20, fontWeight: '700' }, input: { borderWidth: 1, borderColor: '#888', borderRadius: 8, padding: 12 } });
