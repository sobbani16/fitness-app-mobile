import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Action, Card, Copy, Notice, Segmented, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { getCoachingPreference, putCoachingPreference, CoachingPreference } from '../api/coaching';

const MODELS = [
  { value: 'self_guided', label: 'On my own' },
  { value: 'humai_assisted', label: 'Humai assisted' },
  { value: 'trainer_led', label: 'Coach-led' },
  { value: 'hybrid', label: 'Hybrid' },
] as const;
const PRECEDENCE = [
  { value: 'trainer_first', label: 'Coach first' },
  { value: 'humai_first', label: 'Humai first' },
] as const;

export default function CoachingPreferenceScreen() {
  const { colors } = useTheme();
  const [pref, setPref] = useState<CoachingPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState('');

  useFocusEffect(useCallback(() => {
    let live = true;
    setLoading(true); setError(false);
    getCoachingPreference().then(p => { if (live) setPref(p); })
      .catch(() => { if (live) setError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []));

  async function update(patch: Partial<CoachingPreference>) {
    if (busy || !pref) return;
    setBusy(true); setSaved('');
    try { const r = await putCoachingPreference(patch); setPref(r); setSaved('Saved.'); }
    catch { setError(true); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
      <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Coaching mode</Copy>
      {loading && <Skeleton label="Loading preferences" />}
      {error && <Notice error title="Couldn't save" message="Check your connection and try again." />}
      {!!saved && <Notice title="Saved" message={saved} />}
      {pref && !loading && (
        <>
          <Card>
            <Copy size="heading" style={{ fontWeight: '600' }}>Who leads your plan?</Copy>
            <Segmented label="Coaching model" value={pref.model}
              options={MODELS as any} onChange={(m: string) => void update({ model: m as CoachingPreference['model'] })} />
            <Copy size="caption" tone="muted">
              {pref.model === 'trainer_led' ? 'Only your coach\'s plan appears — Humai won\'t silently substitute one.' :
               pref.model === 'hybrid' ? 'Both can contribute — choose whose plan shows first.' :
               pref.model === 'humai_assisted' ? 'Humai suggests; you stay in charge.' : 'You decide everything yourself.'}
            </Copy>
          </Card>
          {pref.model === 'hybrid' && (
            <Card>
              <Copy size="heading" style={{ fontWeight: '600' }}>Whose plan shows first?</Copy>
              <Segmented label="Plan precedence" value={pref.planPrecedence}
                options={PRECEDENCE as any} onChange={(p: string) => void update({ planPrecedence: p as CoachingPreference['planPrecedence'] })} />
              <Copy size="caption" tone="muted">Actions are labeled so you always know whether they came from your coach or Humai.</Copy>
            </Card>
          )}
          <Card>
            <Copy size="heading" style={{ fontWeight: '600' }}>Insights sharing</Copy>
            <Action secondary label={pref.shareInsightsWithTrainer ? 'Insights shared with coach — tap to stop' : 'Share insights with your coach'}
              disabled={busy} onPress={() => void update({ shareInsightsWithTrainer: !pref.shareInsightsWithTrainer })} />
            <Copy size="caption" tone="muted">Lets your coach see Humai-generated insights alongside what you already share. Category consent still applies.</Copy>
          </Card>
        </>
      )}
    </ScrollView>
  );
}
