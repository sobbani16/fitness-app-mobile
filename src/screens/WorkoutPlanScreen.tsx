// AI workout plan: collect missing prefs → generate draft → edit → confirm.
// Plans stay drafts until explicit confirmation; confirm syncs plan days to
// the reminder engine via progressPrefs.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { View } from 'react-native';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { Action, Card, Copy, Field, IconAction, ListRow, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { draftPlan, listPlans, confirmPlan, updateDraft, listCatalog, PersonalPlan, PlanDay, PlanPreferences, CatalogExercise } from '../api/personalPlans';
import { loadProfile } from '../storage/profile';
import { MUSCLE_LABELS } from '../components/MuscleMap';
import { useConfirmLeave } from '../hooks/useConfirmLeave';

const DAYS: [PlanDay['weekday'], string][] = [['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']];
const EQUIPMENT = ['barbell', 'dumbbell', 'band', 'machine', 'pullup-bar', 'bench', 'rack', 'chair', 'box', 'bodyweight'];
const LIMITATIONS = ['seated-only', 'wrist-pain', 'shoulder', 'balance', 'hip', 'knee', 'floor', 'recent-injury', 'rehab'];

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <ListRow title={`${on ? '✓ ' : ''}${label}`} selected={on} onPress={onPress}>
      <Copy tone={on ? 'primary' : 'muted'}>{on ? 'selected' : 'tap to select'}</Copy>
    </ListRow>
  );
}

export default function WorkoutPlanScreen() {
  const { colors } = useTheme();
  const { isEnabled } = useFeatureFlags();
  const [prefs, setPrefs] = useState<PlanPreferences>({});
  const [plan, setPlan] = useState<PersonalPlan | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [replacing, setReplacing] = useState<{ day: number; ex: number } | null>(null);
  const [catalog, setCatalog] = useState<CatalogExercise[] | null>(null);
  const lock = useRef(false);
  const confirmLeave = useConfirmLeave(dirty, busy);
  const editPrefs = (change: React.SetStateAction<PlanPreferences>) => {
    if (lock.current) return;
    setDirty(true); setPrefs(change);
  };

  useEffect(() => {
    let live = true;
    setLoading(true); setLoadError('');
    Promise.all([loadProfile(), listPlans()]).then(([profile, plans]) => {
      if (!live) return;
      const active = plans.find(x => x.status === 'active') || plans.find(x => x.status === 'draft');
      setPrefs(active?.preferences || (profile?.goal ? { goal: profile.goal } : {}));
      setPlan(active || null); setConfirmed(active?.status === 'active'); setDirty(false);
      if (active) void listCatalog(active.preferences || {}).then(setCatalog).catch(() => {});
    }).catch(() => { if (live) setLoadError('Could not load your saved plans. Retry before creating a new plan.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [retry]);

  const toggle = (key: 'equipment' | 'limitations' | 'preferredDays', v: string) =>
    editPrefs(p => {
      const cur = new Set((p[key] as string[]) || []);
      if (cur.has(v)) cur.delete(v); else cur.add(v);
      return { ...p, [key]: [...cur] };
    });

  const generate = useCallback(async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true); setError('');
    try {
      const d = await draftPlan(prefs);
      setPlan(d); setWarnings(d.warnings || []); setConfirmed(false); setDirty(false);
    } catch (e: any) { setError(e?.response?.data?.error || 'Could not generate a plan. Try adjusting preferences.'); }
    finally { lock.current = false; setBusy(false); }
  }, [prefs]);

  const confirm = useCallback(async () => {
    if (!plan || dirty || lock.current) return;
    lock.current = true;
    setBusy(true); setError('');
    try { await confirmPlan(plan); setConfirmed(true); }
    catch { setError('Could not activate the plan. Try again.'); }
    finally { lock.current = false; setBusy(false); }
  }, [plan, dirty]);

  const swapExercise = (dayIdx: number, exIdx: number, dir: 1 | -1) => {
    if (!plan || lock.current || confirmed || plan.status !== 'draft') return;
    const days = plan.plan.days.map((d, i) => i !== dayIdx ? d : {
      ...d, exercises: d.exercises.map((e, j) => {
        if (j !== exIdx) return e;
        return dir === 1 ? { ...e, sets: Math.min(6, e.sets + 1) } : { ...e, sets: Math.max(1, e.sets - 1) };
      }),
    });
    setDirty(true); setPlan({ ...plan, plan: { ...plan.plan, days } });
  };
  const openReplace = async (dayIdx: number, exIdx: number) => {
    if (!plan || confirmed || plan.status !== 'draft') return;
    setReplacing({ day: dayIdx, ex: exIdx });
    if (!catalog) { try { setCatalog(await listCatalog(prefs)); } catch { setCatalog([]); } }
  };
  const replaceExercise = (dayIdx: number, exIdx: number, next: string) => {
    if (!plan || lock.current) return;
    const days = plan.plan.days.map((d, i) => i !== dayIdx ? d : {
      ...d, exercises: d.exercises.map((e, j) => j === exIdx ? { ...e, exerciseId: next, why: 'Swapped by you' } : e),
    });
    setDirty(true); setPlan({ ...plan, plan: { ...plan.plan, days } }); setReplacing(null);
  };
  const removeExercise = (dayIdx: number, exIdx: number) => {
    if (!plan || lock.current || confirmed || plan.status !== 'draft') return;
    const days = plan.plan.days.map((d, i) => i !== dayIdx ? d : { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx) });
    setDirty(true); setPlan({ ...plan, plan: { ...plan.plan, days } });
  };
  const saveEdits = async () => {
    if (!plan || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const r = await updateDraft(plan.id, plan.plan, prefs);
      setPlan({ ...plan, plan: r.plan }); setWarnings(r.warnings || []); setDirty(false); setError('');
    }
    catch { setError('Could not save edits.'); }
    finally { lock.current = false; setBusy(false); }
  };

  if (loading || loadError) return <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
    {loading ? <Skeleton label="Loading workout plans" /> : <><Notice error title="Plans unavailable" message={loadError} /><Action label="Retry plans" onPress={() => setRetry(value => value + 1)} /></>}
  </KeyboardAwareScrollView>;

  return (
    <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
      <Card>
        <Copy size="heading">Your workout plan</Copy>
        <Copy tone="muted">Answer only what’s missing — everything is optional and editable later. Generated plans are drafts until you confirm.</Copy>
      </Card>
      {error !== '' && <Card><Notice title="Something went wrong" message={error} /></Card>}
      {warnings.map((w, i) => <Card key={i}><Notice title="Adjusted" message={w} /></Card>)}

      {!plan && <>
        <Card>
          <Copy size="heading">Location</Copy>
          {['gym', 'home', 'outdoors', 'mixed'].map(l => <Chip key={l} label={l} on={prefs.location === l} onPress={() => editPrefs(p => ({ ...p, location: l }))} />)}
        </Card>
        <Card>
          <Copy size="heading">Equipment you have</Copy>
          {EQUIPMENT.map(e => <Chip key={e} label={e} on={(prefs.equipment || []).includes(e)} onPress={() => toggle('equipment', e)} />)}
        </Card>
        <Card>
          <Copy size="heading">Experience</Copy>
          {['beginner', 'intermediate', 'advanced'].map(e => <Chip key={e} label={e} on={prefs.experience === e} onPress={() => editPrefs(p => ({ ...p, experience: e }))} />)}
        </Card>
        <Card>
          <Copy size="heading">Days you can train</Copy>
          {DAYS.map(([d, l]) => <Chip key={d} label={l} on={(prefs.preferredDays || []).includes(d)} onPress={() => toggle('preferredDays', d)} />)}
          <Field label="Minutes per session (optional)" value={prefs.sessionMinutes ? String(prefs.sessionMinutes) : ''} editable={!busy} keyboardType="number-pad" onChangeText={v => editPrefs(p => ({ ...p, sessionMinutes: Number(v) || undefined }))} />
        </Card>
        <Card>
          <Copy size="heading">Mobility or access needs (optional)</Copy>
          <Copy tone="muted">Selecting recent injury or rehab routes exercises to qualified review instead of auto-prescribing.</Copy>
          {LIMITATIONS.map(l => <Chip key={l} label={l.replace(/-/g, ' ')} on={(prefs.limitations || []).includes(l)} onPress={() => toggle('limitations', l)} />)}
        </Card>
        {isEnabled('aiWorkoutRecommendations')
          ? <Action label={busy ? 'Generating…' : 'Generate my draft plan'} onPress={generate} disabled={busy} />
          : <Notice title="AI plans unavailable" message="Plan generation is currently unavailable." />}
      </>}

      {plan && <>
        <Card>
          <Copy size="heading">{confirmed ? 'Active plan' : 'Draft'} · version {plan.version}</Copy>
          <Copy tone="muted">{plan.plan.summary || 'Review each exercise, adjust sets, remove what does not fit. Nothing activates until you confirm.'}</Copy>
        </Card>
        {plan.plan.days.map((d, di) => (
          <Card key={di}>
            <Copy size="heading">{DAYS.find(x => x[0] === d.weekday)?.[1] || d.weekday}{d.focus ? ` — ${d.focus}` : ''}</Copy>
            {catalog && <Copy tone="muted">Muscles: {[...new Set(d.exercises.flatMap(e => catalog.find(c => c.id === e.exerciseId)?.muscle || []))].map(m => MUSCLE_LABELS[m] || m).join(', ') || 'none listed'}</Copy>}
            {(d.warmup || []).length > 0 && <Copy tone="muted">Warm-up: {(d.warmup || []).join(', ')}</Copy>}
            {(d.cooldown || []).length > 0 && <Copy tone="muted">Cool-down: {(d.cooldown || []).join(', ')}</Copy>}
            {d.exercises.map((e, ei) => (
              <ListRow key={ei} title={`${e.exerciseId.replace(/-/g, ' ')} — ${e.sets}×${e.reps}`}
                subtitle={`rest ${e.restSec}s${e.startResistance ? ` · start: ${e.startResistance}` : ''}${e.why ? `\n${e.why}` : ''}`}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <IconAction icon="−" disabled={busy || confirmed} label={`Fewer sets for ${e.exerciseId}`} onPress={() => swapExercise(di, ei, -1)} />
                  <IconAction icon="＋" disabled={busy || confirmed} label={`More sets for ${e.exerciseId}`} onPress={() => swapExercise(di, ei, 1)} />
                  <IconAction icon="⇄" disabled={busy || confirmed} label={`Replace ${e.exerciseId}`} onPress={() => void openReplace(di, ei)} />
                  <IconAction icon="✕" disabled={busy || confirmed} label={`Remove ${e.exerciseId}`} onPress={() => removeExercise(di, ei)} />
                </View>
              </ListRow>
            ))}
            {replacing?.day === di && replacing.ex != null && catalog !== null && (() => {
              const cur = catalog.find(x => x.id === d.exercises[replacing.ex]?.exerciseId);
              const options = catalog.filter(c => c.suitability.status === 'suitable' && c.id !== cur?.id)
                .sort((a, b) => Number(b.pattern === cur?.pattern) - Number(a.pattern === cur?.pattern));
              return (
                <View style={{ gap: 4 }}>
                  <Copy size="caption" tone="muted">Swap with a suitable alternative — saving re-checks all rules.</Copy>
                  {options.map(c => <ListRow key={c.id} title={c.name}
                    subtitle={`${c.pattern}${c.suitability.status === 'adapt' ? ' · ' + (c.suitability.reasons[0] || 'adapted option') : ''}`}
                    onPress={() => replaceExercise(di, replacing.ex, c.id)} />)}
                  <Action secondary label="Cancel swap" onPress={() => setReplacing(null)} />
                </View>
              );
            })()}
          </Card>
        ))}
        {!confirmed && <Action label={busy ? 'Saving…' : 'Save edits'} secondary onPress={saveEdits} disabled={busy || !dirty} />}
        {dirty && <Copy>Save your edits before confirming this plan.</Copy>}
        {confirmed
          ? <Card><Notice title="Plan active" message="Reminders will follow your plan days — manage them in Smart Reminders." /></Card>
          : <Action label={busy ? 'Confirming…' : 'Confirm and activate plan'} onPress={confirm} disabled={busy || dirty} />}
        <Action label="Start over" secondary disabled={busy} onPress={() => confirmLeave(() => { setPlan(null); setConfirmed(false); setDirty(false); })} />
      </>}
    </KeyboardAwareScrollView>
  );
}
