import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, ActivityIndicator } from 'react-native';
import { finishLegacyUpgrade, legacyDeviceId, migrateLegacyAccount } from '../services/legacyMigration';
import { getSession } from '../storage/session';
export default function LegacyMigrationGate({ children, manual = false }: { children: React.ReactNode; manual?: boolean }) {
  const [legacy, setLegacy] = useState<string | null>(null), [loading, setLoading] = useState(true), [skip, setSkip] = useState(false);
  const [code, setCode] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => { legacyDeviceId().then(setLegacy).catch(() => setError('Unable to check old device data.')).finally(() => setLoading(false)); }, []);
  async function run() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      if (getSession()?.user.id === legacy) await finishLegacyUpgrade();
      else await migrateLegacyAccount(code, password);
      setLegacy(null); setSkip(true);
    } catch (e: any) { setError(e.response?.data?.error || e.message || 'Migration failed. Your old records have not been removed.'); }
    finally { setPassword(''); setBusy(false); inFlight.current = false; }
  }
  if (loading) return <ActivityIndicator accessibilityLabel="Checking for old account" />;
  if (skip || (!legacy && !manual)) return <>{children}</>;
  const approved = getSession()?.user.id === legacy;
  return <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
    <Text style={{ fontSize: 24, fontWeight: '700' }}>Keep your old fitness records</Text>
    <Text>A device ID alone cannot establish ownership. Request an independent ownership review through the service operator before migrating.</Text>
    {!!legacy && <Text selectable>Reference: {legacy}</Text>}
    <Text>Use a verified account before completing its profile. Accounts that already contain data require a separate merge review. Skipping keeps old records separate and does not transfer them.</Text>
    {!approved && <View style={{ gap: 12 }}>
      <TextInput accessibilityLabel="Migration code" placeholder="One-time migration code" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} secureTextEntry editable={!busy} style={{ borderWidth: 1, padding: 12 }} />
      <TextInput accessibilityLabel="Migration account password" placeholder="Current account password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" editable={!busy} style={{ borderWidth: 1, padding: 12 }} />
    </View>}
    <Button title={approved ? 'Finish importing old device records' : 'Migrate approved account'} disabled={busy || (!approved && (!code || !password))} onPress={run} />
    <Button title="Continue without migration" disabled={busy} onPress={() => setSkip(true)} />
    {!!error && <Text accessibilityRole="alert">{error}</Text>}
  </ScrollView>;
}
