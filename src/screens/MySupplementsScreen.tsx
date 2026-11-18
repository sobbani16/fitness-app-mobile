import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Action, Card, Copy, ListRow, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import * as api from '../api/supplements';
import { syncReminderSchedules } from '../services/reminderSync';

const STATUS_LABEL: Record<string, string> = { PENDING: 'Due', SNOOZED: 'Snoozed', TAKEN: 'Taken', SKIPPED: 'Skipped', MISSED: 'Missed' };

function doseLabel(o: api.DoseOccurrence): string {
  if (o.doseAmount != null && o.doseUnit) return `${o.doseAmount} ${o.doseUnit}`;
  return o.schedule?.dose || '1 serving';
}

export default function MySupplementsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [supplements, setSupplements] = useState<api.Supplement[]>([]);
  const [today, setToday] = useState<{ date: string; occurrences: api.DoseOccurrence[] }>({ date: '', occurrences: [] });
  const [safety, setSafety] = useState<api.SafetyReport | null>(null);
  const [adherence, setAdherence] = useState<{ taken: number; expected: number } | null>(null);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [mine, doses, hist, safetyReport] = await Promise.all([
        api.getMySupplements(),
        api.getTodayDoses(),
        api.getSupplementHistory(7).catch(() => null),
        api.getSupplementSafety().catch(() => null),
      ]);
      setSupplements(mine);
      setToday(doses);
      setSafety(safetyReport);
      if (hist?.occurrences) {
        const taken = hist.occurrences.filter(o => o.status === 'TAKEN').length;
        const expected = hist.occurrences.filter(o => o.status !== 'CANCELLED').length;
        setAdherence({ taken, expected });
      } else setAdherence(null);
      setError('');
    } catch { setError('Could not load your supplements. Check your connection.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function act(o: api.DoseOccurrence, action: api.DoseAction, minutes?: number) {
    setBusyId(o.id);
    try {
      await api.doseAction(o.id, action, { minutes, source: 'app' });
      await load();
      void syncReminderSchedules(true);
    } catch { setError('Could not update that dose. Try again.'); }
    finally { setBusyId(''); }
  }

  if (loading && !supplements.length) return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20 }}><Skeleton label="Loading supplements" /></ScrollView>;

  const pending = today.occurrences.filter(o => o.status === 'PENDING' || o.status === 'SNOOZED' || o.status === 'MISSED');
  const done = today.occurrences.filter(o => o.status === 'TAKEN' || o.status === 'SKIPPED');
  const warnings = safety?.warnings?.length ?? 0;

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
    <Card>
      <Copy size="heading">Today’s doses</Copy>
      {!!error && <Notice error title="Something went wrong" message={error} />}
      {!pending.length && !done.length && <Copy tone="muted">No doses scheduled for today. Add a schedule to a supplement to plan doses.</Copy>}
      {pending.map(o => <Card key={o.id} style={{ padding: 14 }}>
        <Copy style={{ fontWeight: '600' }}>{o.userSupplement?.supplement?.name || 'Supplement'}</Copy>
        <Copy size="caption" tone="muted">{doseLabel(o)}{o.localTime ? ` · ${o.localTime}` : ''} · {STATUS_LABEL[o.status] || o.status}</Copy>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Action label="Mark taken" disabled={busyId === o.id} onPress={() => void act(o, 'taken')} />
          <Action secondary label="Snooze 30m" disabled={busyId === o.id} onPress={() => void act(o, 'snoozed', 30)} />
          <Action secondary label="Skip" disabled={busyId === o.id} onPress={() => void act(o, 'skipped')} />
        </View>
      </Card>)}
      {done.length > 0 && <Copy size="caption" tone="muted">{done.map(o => `${o.userSupplement?.supplement?.name || 'Dose'}: ${STATUS_LABEL[o.status]}`).join('  ·  ')}</Copy>}
    </Card>

    {adherence != null && adherence.expected > 0 && <Card>
      <Copy size="heading">Last 7 days</Copy>
      <Copy>{adherence.taken} of {adherence.expected} scheduled doses taken</Copy>
    </Card>}

    {warnings > 0 && <Card>
      <Copy size="heading">Safety notes</Copy>
      {safety!.warnings.slice(0, 4).map((w, i) => <Copy key={i} tone="muted">{w.message}</Copy>)}
      <Copy size="caption" tone="muted">{safety!.disclaimers[0]}</Copy>
    </Card>}

    <Card>
      <Copy size="heading">My supplements</Copy>
      {!supplements.length && <Copy tone="muted">Nothing selected yet. Add supplements to build your routine.</Copy>}
      {supplements.map(s => <ListRow
        key={s.userSupplementId || s.id}
        title={s.personalLabel?.name || s.name}
        subtitle={[s.brand || s.personalLabel?.brand, s.catalogStatus === 'personal' ? 'Personal' : (s.ingredient?.evidenceClass || s.category), s.schedules?.length ? `${s.schedules.length} schedule${s.schedules.length === 1 ? '' : 's'}` : 'no schedule'].filter(Boolean).join(' · ')}
        onPress={() => navigation.navigate('SupplementDetail', { supplementId: s.id, userSupplementId: s.userSupplementId })} />)}
      <Action label="Add supplement" onPress={() => navigation.navigate('AddSupplement')} />
    </Card>
  </ScrollView>;
}
