import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Action, Card, Copy, Field, ListRow, Notice } from '../design/components';
import { useTheme } from '../design/theme';
import * as api from '../api/supplements';
import { syncReminderSchedules } from '../services/reminderSync';

export default function AddSupplementScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<api.Supplement[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [showPersonal, setShowPersonal] = useState(false);
  const [personal, setPersonal] = useState({ name: '', brand: '', servingText: '', doseAmount: '', doseUnit: '' });
  const [busy, setBusy] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try { setResults(await api.searchSupplements(q)); setError(''); }
    catch { setError('Search failed. Check your connection.'); }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void search(query), 350);
    return () => clearTimeout(t);
  }, [query, search]);

  async function add(s: api.Supplement) {
    setBusy(true);
    try {
      const sel = await api.selectSupplement(s.id);
      void syncReminderSchedules(true);
      navigation.replace('SupplementDetail', { supplementId: s.id, userSupplementId: sel.userSupplementId });
    } catch { setError('Could not add it. Try again.'); }
    finally { setBusy(false); }
  }

  async function createPersonal() {
    if (!personal.name.trim()) { setError('A name is required.'); return; }
    setBusy(true);
    try {
      const sel = await api.createPersonalSupplement({
        name: personal.name.trim(),
        brand: personal.brand.trim() || undefined,
        servingText: personal.servingText.trim() || undefined,
        doseAmount: personal.doseAmount ? Number(personal.doseAmount) : undefined,
        doseUnit: personal.doseUnit.trim() || undefined,
      });
      void syncReminderSchedules(true);
      navigation.replace('SupplementDetail', { supplementId: sel.id, userSupplementId: sel.userSupplementId });
    } catch { setError('Could not create it. Try again.'); }
    finally { setBusy(false); }
  }

  function badgeFor(s: api.Supplement): string {
    if (s.catalogStatus === 'candidate' || s.unverified) return 'Research draft — unverified';
    if (s.catalogStatus === 'review_only') return 'Review-only';
    return s.category || '';
  }

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
    <Card>
      <Copy size="heading">Find a supplement</Copy>
      {!!error && <Notice error title="Something went wrong" message={error} />}
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="e.g. creatine, magnesium, D3" autoCapitalize="none" />
      {searching && <Copy size="caption" tone="muted">Searching…</Copy>}
      {results.map(s => <ListRow key={s.id} title={s.name} subtitle={[s.brand, badgeFor(s)].filter(Boolean).join(' · ')} onPress={() => void add(s)} />)}
      {!searching && query.trim().length > 1 && !results.length && <Copy tone="muted">No matches. Try a different spelling — or add it as a personal supplement below.</Copy>}
    </Card>

    <Card>
      {!showPersonal
        ? <Action secondary label="Can't find it? Add a personal supplement" onPress={() => setShowPersonal(true)} />
        : <>
          <Copy size="heading">Personal supplement</Copy>
          <Copy size="caption" tone="muted">Private to you. Only name is required; nutrient values stay unverified.</Copy>
          <Field label="Name" value={personal.name} onChangeText={v => setPersonal(p => ({ ...p, name: v }))} />
          <Field label="Brand (optional)" value={personal.brand} onChangeText={v => setPersonal(p => ({ ...p, brand: v }))} />
          <Field label="Serving (e.g. 2 capsules, 1 scoop)" value={personal.servingText} onChangeText={v => setPersonal(p => ({ ...p, servingText: v }))} />
          <Field label="Dose amount (optional)" value={personal.doseAmount} onChangeText={v => setPersonal(p => ({ ...p, doseAmount: v }))} keyboardType="decimal-pad" />
          <Field label="Dose unit (g, mg, IU…)" value={personal.doseUnit} onChangeText={v => setPersonal(p => ({ ...p, doseUnit: v }))} />
          <Action label={busy ? 'Saving…' : 'Add to my supplements'} disabled={busy} onPress={() => void createPersonal()} />
        </>}
    </Card>
  </ScrollView>;
}
