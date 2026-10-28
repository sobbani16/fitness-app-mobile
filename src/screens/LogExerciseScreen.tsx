import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { Action, Card, Copy, Field, IconAction, ListRow, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { useExerciseSession } from '../hooks/useExerciseSession';
import { useExerciseDetection } from '../hooks/useExerciseDetection';
import { EXERCISE_TYPES, ExerciseSession } from '../types/exercise';
import { listSessions } from '../api/exercises';
import { clockText, displayWeight, elapsed, exerciseName, toPounds, validateSet, WeightUnit } from '../services/exerciseAutofill';
import { accountStorage } from '../storage/accountStorage';
import { accountKey, getSession } from '../storage/session';
import PoseCameraScreen from './PoseCameraScreen';

type Template = { name: string; exerciseType: string; reps: number; weight: number; sets: number };
type Preferences = { favorites: string[]; templates: Template[]; unit: WeightUnit };
const categories: Record<string, string> = { 'bench-press': 'Push', 'overhead-press': 'Push', 'push-up': 'Push', 'barbell-row': 'Pull', 'pull-up': 'Pull', squat: 'Legs', deadlift: 'Legs' };
export default function LogExerciseScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const focused = useIsFocused();
  const workout = useExerciseSession();
  const { draft, sets, loading, saving, error } = workout;
  const detection = useExerciseDetection();
  const stopDetection = detection.stop;
  const [camera, setCamera] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<string>(EXERCISE_TYPES[0]);
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('');
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [history, setHistory] = useState<ExerciseSession[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [prefs, setPrefs] = useState<Preferences>({ favorites: [], templates: [], unit: 'lb' });
  const [prefsReady, setPrefsReady] = useState(false);
  const [localError, setLocalError] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [targetSets, setTargetSets] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const prefsBusy = useRef(false);
  const fieldDirty = useRef(false);
  const identity = useRef({ id: getSession()?.user.id, key: accountKey('fitness.workoutPreferences.v1') }).current;
  const ownAccount = () => !!identity.id && identity.id === getSession()?.user.id;
  const exercise = draft?.exerciseType || selected;
  const finished = !!draft?.session?.finishedAt;
  const locked = saving || !!draft?.pending || !!draft?.finishing;
  useEffect(() => {
    let active = true;
    accountStorage.getItem(identity.key).then(raw => {
      if (!active || identity.id !== getSession()?.user.id) return;
      if (raw) setPrefs(JSON.parse(raw));
      setPrefsReady(true);
    }).catch(() => { if (active) setLocalError('Could not load saved workout preferences. Reopen this screen to retry.'); });
    return () => { active = false; };
  }, [identity]);
  useEffect(() => {
    if (!focused) return;
    let active = true;
    setHistoryLoading(true); setHistoryError('');
    listSessions().then(items => { if (active && identity.id === getSession()?.user.id) setHistory(items); })
      .catch(() => { if (active) setHistoryError('History could not load. Your current workout is still available.'); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [focused, refresh, finished, identity]);
  useEffect(() => {
    if (!focused || !draft || finished) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [focused, draft, finished]);
  useEffect(() => {
    if (!focused) { setCamera(false); void stopDetection(); }
  }, [focused, stopDetection]);
  // Restore an interrupted set, otherwise reuse the last saved weight. Never overwrite edits with late history.
  useEffect(() => {
    if (!draft) return;
    const last = draft.pending || draft.session?.sets.at(-1);
    if (last && Number.isFinite(last.weight) && !fieldDirty.current) { setReps(String(last.reps)); setWeight(String(displayWeight(last.weight, prefs.unit))); }
  }, [draft, prefs.unit]);
  useEffect(() => {
    if (camera && detection.reps > 0) setReps(String(detection.reps));
  }, [camera, detection.reps]);
  const savePreferences = async (next: Preferences) => {
    if (prefsBusy.current || !prefsReady || !ownAccount()) return;
    prefsBusy.current = true;
    try { await accountStorage.setItem(identity.key, JSON.stringify(next)); if (ownAccount()) { setPrefs(next); setLocalError(''); return true; } }
    catch { setLocalError('Could not save preferences. Please try again.'); }
    finally { prefsBusy.current = false; }
  };
  const choose = (type: string, template?: Template) => {
    setSelected(type); fieldDirty.current = false; setTargetSets(template?.sets || null);
    const prior = history.find(s => s.exerciseType === type)?.sets.at(-1);
    const source = template || prior;
    setReps(String(source?.reps || 10)); setWeight(source && Number.isFinite(source.weight) ? String(displayWeight(source.weight, prefs.unit)) : '');
  };
  const changeUnit = async (unit: WeightUnit) => {
    if (locked || prefsBusy.current) return;
    const value = weight.trim() === '' ? '' : String(displayWeight(toPounds(Number(weight), prefs.unit), unit));
    if (await savePreferences({ ...prefs, unit })) { fieldDirty.current = true; setWeight(value); }
  };
  const saveSet = async () => {
    const ok = await workout.addSet(Number(reps), toPounds(Number(weight), prefs.unit));
    if (ok) { setRestUntil(Date.now() + 60000); setNow(Date.now()); fieldDirty.current = false; }
  };
  const closeCamera = async () => { setCamera(false); await detection.stop(); };
  const weightLabel = (value: number) => Number.isFinite(value) ? `${displayWeight(value, prefs.unit)} ${prefs.unit}` : 'weight not recorded';
  const previous = history.find(s => s.exerciseType === exercise && s.id !== draft?.id);
  const recent = [...new Set(history.map(s => s.exerciseType))].slice(0, 5);
  const candidates = EXERCISE_TYPES.filter(t => exerciseName(t).toLowerCase().includes(query.toLowerCase()) &&
    (category === 'All' || (category === 'Favorites' ? prefs.favorites.includes(t) : categories[t] === category)));
  return <>
    {camera && <PoseCameraScreen visible onClose={closeCamera} detection={detection} />}
    <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
      <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>{finished ? 'Workout review' : draft ? 'Workout in progress' : 'Workout'}</Copy>
      <Copy tone="muted">{draft ? exerciseName(exercise) : 'Choose an exercise. Build your workout one set at a time.'}</Copy>
      {loading && <Skeleton label="Restoring workout" />}
      {localError !== '' && <Notice title="Preferences unavailable" message={localError} error />}
      {error && <Notice title="Workout needs attention" message={error} error />}
      {!loading && !draft && <>
        <Card><Field label="Search exercises" value={query} onChangeText={setQuery} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['All', 'Push', 'Pull', 'Legs', 'Favorites'].map(item => <Action key={item} label={item} secondary selected={category === item} onPress={() => setCategory(item)} />)}</View>
          <View style={{ marginTop: 4 }}>
            {candidates.map(type => { const fav = prefs.favorites.includes(type); return <ListRow key={type}
              title={exerciseName(type)} subtitle={selected === type ? 'Selected' : categories[type] || undefined}
              onPress={() => choose(type)}>
              <IconAction icon={fav ? '♥' : '♡'} label={fav ? `Remove favorite: ${exerciseName(type)}` : `Save favorite: ${exerciseName(type)}`}
                onPress={() => void savePreferences({ ...prefs, favorites: fav ? prefs.favorites.filter(t => t !== type) : [...prefs.favorites, type] })} />
            </ListRow>; })}
          </View>
          {!candidates.length && <Copy tone="muted">No matching exercises. Try another category or search.</Copy>}
        </Card>
        {recent.length > 0 && <Card style={{ paddingVertical: 4 }}><Copy size="heading" style={{ paddingVertical: 12 }}>Recent exercises</Copy>{recent.map(type => <ListRow key={type} title={exerciseName(type)} onPress={() => choose(type)}><IconAction icon="↻" label={`Start ${exerciseName(type)}`} onPress={() => choose(type)} /></ListRow>)}</Card>}
        {prefs.templates.length > 0 && <Card><Copy size="heading">Your templates</Copy><Copy tone="muted">Single-exercise routines saved on this device. Sets are logged individually.</Copy>
          {prefs.templates.map(t => <View key={t.name} style={{ gap: 8 }}><Action secondary label={`${t.name} · ${t.sets} sets of ${t.reps}`} onPress={() => choose(t.exerciseType, t)} />
            <Action secondary label={`Remove ${t.name}`} onPress={() => void savePreferences({ ...prefs, templates: prefs.templates.filter(x => x.name !== t.name) })} /></View>)}
        </Card>}
        <Card><Copy size="heading">{exerciseName(selected)}</Copy>
          <Action secondary disabled={!prefsReady} label={prefs.favorites.includes(selected) ? 'Remove from favorites' : 'Save favorite exercise'} onPress={() => void savePreferences({ ...prefs, favorites: prefs.favorites.includes(selected) ? prefs.favorites.filter(t => t !== selected) : [...prefs.favorites, selected] })} />
          {targetSets && <Copy>{targetSets} planned sets</Copy>}
          <Action secondary label="Find technique videos" onPress={() => navigation.navigate('VideoSearch', { query: `${exerciseName(selected)} proper form tutorial`, context: 'exercise', exerciseKey: selected })} />
          <Action label="Start workout" disabled={!prefsReady || saving || !workout.ready} onPress={() => void workout.start(selected)} />
        </Card>
      </>}
      {historyLoading && <Skeleton label="Loading previous performance" />}
      {historyError !== '' && <Card><Notice title="History unavailable" message={historyError} /><Action label="Retry history" secondary onPress={() => setRefresh(v => v + 1)} /></Card>}
      {!draft && history.length > 0 && <Card><Copy size="heading">Recent workouts</Copy>
        <Copy tone="muted">Up to 200 recent sessions are available from your account. Older sessions may not have a recorded finish.</Copy>
        {history.slice(0, 5).map(session => <View key={session.id} style={{ gap: 8 }}>
          <Action secondary label={`${exerciseName(session.exerciseType)} · ${new Date(session.createdAt).toLocaleDateString()} · ${session.sets.length} sets`} onPress={() => setReviewId(reviewId === session.id ? null : session.id)} />
          {reviewId === session.id && <><Copy>{session.finishedAt ? 'Finished workout' : 'Recorded session; finish not recorded'}</Copy>
            {session.sets.map((set, i) => <Copy key={set.id || i}>Set {i + 1}: {set.reps} reps × {weightLabel(set.weight)}</Copy>)}
          </>}
        </View>)}
      </Card>}
      {draft && !finished && <>
        <Card><Copy size="heading">{clockText(elapsed(draft.startedAt, now))} elapsed</Copy>
          <Copy tone="muted">Your workout stays on this device while in progress. Saved sets are stored in your account.</Copy>
          {previous?.sets.length ? <Copy>Previous: {previous.sets.length} sets · last set {previous.sets.at(-1)!.reps} reps at {weightLabel(previous.sets.at(-1)!.weight)}</Copy> : <Copy tone="muted">No previous performance available.</Copy>}
          {!sets.length && previous?.sets.length && Number.isFinite(previous.sets.at(-1)!.weight) && <Action secondary label="Use previous set" disabled={locked} onPress={() => { const last = previous.sets.at(-1)!; setReps(String(last.reps)); setWeight(String(displayWeight(last.weight, prefs.unit))); fieldDirty.current = true; }} />}
          <View style={{ flexDirection: 'row', gap: 12 }}>{(['lb', 'kg'] as const).map(unit => <View key={unit} style={{ flex: 1 }}><Action label={unit} selected={prefs.unit === unit} secondary={prefs.unit !== unit} disabled={locked || !prefsReady} onPress={() => void changeUnit(unit)} /></View>)}</View>
          <Field label="Reps" value={reps} editable={!locked} keyboardType="number-pad" onChangeText={v => { fieldDirty.current = true; setReps(v); }} />
          <Field label={`Weight (${prefs.unit})`} value={weight} editable={!locked} keyboardType="decimal-pad" onChangeText={v => { fieldDirty.current = true; setWeight(v.replace(',', '.')); }} />
          <Copy tone="muted">Enter added weight only. Use 0 for bodyweight exercises.</Copy>
          {!draft.pending && <Action label={saving ? 'Saving set…' : `Log set ${sets.length + 1}`} disabled={locked || !weight.trim() || !!validateSet(Number(reps), toPounds(Number(weight), prefs.unit))} onPress={() => void saveSet()} />}
          {draft.pending && <><Notice title="Set awaiting confirmation" message="Your set is kept on this device. Reconnect and retry; the same set will not be logged twice." /><Action label="Retry saved set" disabled={saving} onPress={() => void saveSet()} /></>}
          <Action secondary label="Camera rep count and form" disabled={locked || detection.status === 'loading'} onPress={async () => { setCamera(true); await detection.start(exercise); }} />
          {detection.error && <Notice title="Camera unavailable" message={detection.error} error />}
          <Copy tone="muted">Review camera counts before saving. Form feedback is an estimate.</Copy>
        </Card>
        {restUntil && <Card><Copy size="heading">{now < restUntil ? `Rest · ${clockText(Math.ceil((restUntil - now) / 1000))}` : 'Rest timer complete'}</Copy><Copy tone="muted">Rest as long as you need. This timer does not send background alerts.</Copy><Action secondary label="Restart 60-second rest" onPress={() => { setRestUntil(Date.now() + 60000); setNow(Date.now()); }} /><Action secondary label="Dismiss rest timer" onPress={() => setRestUntil(null)} /></Card>}
      </>}
      {draft && <Card><Copy size="heading">{finished ? 'Saved workout' : 'Logged sets'} · {sets.length}</Copy>
        {!sets.length && <Copy tone="muted">Your first set will appear here after it is saved.</Copy>}
        {sets.map((s, i) => <Copy key={s.id || i}>Set {i + 1}: {s.reps} reps × {weightLabel(s.weight)}</Copy>)}
        {finished ? <>
          <Copy>{sets.reduce((sum, s) => sum + s.reps, 0)} total reps · {clockText(elapsed(draft.startedAt, Date.parse(draft.session!.finishedAt!)))} elapsed</Copy>
          <Copy tone="muted">Workout saved. Showing up counts.</Copy>
          <Field label="Template name" value={templateName} maxLength={60} onChangeText={setTemplateName} />
          <Action secondary label="Save as template" disabled={!templateName.trim() || !prefsReady} onPress={() => { const last = sets.at(-1)!; void savePreferences({ ...prefs, templates: [...prefs.templates.filter(t => t.name !== templateName.trim()), { name: templateName.trim(), exerciseType: exercise, reps: last.reps, weight: last.weight, sets: sets.length }].slice(-20) }); }} />
          {prefs.templates.some(t => t.name === templateName.trim()) && <Copy>Template saved on this device.</Copy>}
          <Action label="Done" disabled={saving} onPress={async () => { if (await workout.clear()) { setRestUntil(null); setTargetSets(null); } }} />
        </> : <>
          {!!sets.length && <Action label={draft.finishing ? 'Retry finishing workout' : 'Finish workout'} disabled={saving || !!draft.pending} onPress={async () => { await closeCamera(); await workout.finish(); }} />}
          {!sets.length && !draft.pending && <Action secondary label="Cancel empty workout" disabled={saving} onPress={() => void workout.clear()} />}
        </>}
      </Card>}
    </KeyboardAwareScrollView>
  </>;
}
