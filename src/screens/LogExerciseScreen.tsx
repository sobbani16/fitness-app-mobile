import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { Action, Card, Copy, Field, IconAction, ListRow, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { useExerciseSession } from '../hooks/useExerciseSession';
import { useExerciseDetection } from '../hooks/useExerciseDetection';
import { EXERCISE_TYPES, ExerciseSession } from '../types/exercise';
import { listSessions } from '../api/exercises';
import { listPlans, getSuggestions, listCatalog, PlanDay, Suggestion, CatalogExercise } from '../api/personalPlans';
import MuscleMap, { MUSCLE_LABELS } from '../components/MuscleMap';
import VoiceInput from '../components/VoiceInput';
import { openYouTubeSearch } from '../services/youtubeSearch';
import { loadProgressPrefs, saveProgressPrefs } from '../storage/progressPrefs';
import { syncReminderSchedules } from '../services/reminderSync';
import { clockText, displayWeight, elapsed, exerciseName, toPounds, validateSet, WeightUnit } from '../services/exerciseAutofill';
import { accountStorage } from '../storage/accountStorage';
import { accountKey, getSession } from '../storage/session';
import PoseCameraScreen from './PoseCameraScreen';
import { FeatureGate } from '../components/FeatureGate';
import { useFeatureFlags } from '../context/FeatureFlagsContext';

type Template = { name: string; exerciseType: string; reps: number; weight: number; sets: number };
type Preferences = { favorites: string[]; templates: Template[]; unit: WeightUnit };
const categories: Record<string, string> = { 'bench-press': 'Push', 'overhead-press': 'Push', 'push-up': 'Push', 'barbell-row': 'Pull', 'pull-up': 'Pull', squat: 'Legs', deadlift: 'Legs' };
export default function LogExerciseScreen({ route }: { route?: { params?: { start?: string } } }) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { isEnabled } = useFeatureFlags();
  const focused = useIsFocused();
  const workout = useExerciseSession();
  const { draft, sets, loading, saving, error } = workout;
  const detection = useExerciseDetection();
  const [workoutPlan, setWorkoutPlan] = useState<number[]>([]);
  const [planDay, setPlanDay] = useState<PlanDay | null>(null);
  const [suggestionMap, setSuggestionMap] = useState<Record<string, Suggestion>>({});
  const [missedNote, setMissedNote] = useState('');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [fb, setFb] = useState<Record<string, { sessionId?: string; rir?: number; discomfort?: boolean }>>({});
  const [fbSaved, setFbSaved] = useState(false);
  const saveFb = async (ex: string, patch: { rir?: number; discomfort?: boolean }) => {
    if (!ownAccount()) return;
    const sessionId = draft?.session?.id;
    if (!sessionId) return;
    const prior = fb[ex]?.sessionId === sessionId ? fb[ex] : {};
    const next = { ...fb, [ex]: { ...prior, ...patch, sessionId } };
    try { await accountStorage.setItem(identity.fbKey, JSON.stringify(next)); setFb(next); setFbSaved(true); }
    catch { setLocalError('Could not save your session feedback.'); }
  };
  const toggleCheck = (key: string) => setChecks(c => ({ ...c, [key]: !c[key] }));
  const checklist = (phase: 'warmup' | 'cooldown') => planDay?.[phase]?.length ? (
    <Card>
      <Copy size="heading">{phase === 'warmup' ? 'Warm-up' : 'Cool-down'} — check off as you go</Copy>
      <Copy tone="muted">Optional steps from your plan. Completion stays on this device — tap a step to mark it done.</Copy>
      {planDay[phase]!.map((step, i) => {
        const key = `${phase}-${i}`; const done = !!checks[key];
        return <ListRow key={key} title={`${done ? '✓ ' : ''}${step}`} selected={done} onPress={() => toggleCheck(key)}>
          <Copy tone={done ? 'primary' : 'muted'}>{done ? 'Done' : 'tap when done'}</Copy>
        </ListRow>;
      })}
    </Card>
  ) : null;
  const WDKEY: PlanDay['weekday'][] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  useEffect(() => {
    if (!focused) return;
    let live = true;
    const loadFb = async () => { if (!ownAccount()) return {}; const raw = await accountStorage.getItem(identity.fbKey).catch(() => null); try { return raw ? JSON.parse(raw) : {}; } catch { return {}; } };
    loadFb().then(async map => {
      if (!live) return;
      setFb(map);
      const plans = await listPlans().catch(() => []);
      const catalog = await listCatalog().catch(() => []);
      if (!live) return;
      setCatalogMap(Object.fromEntries(catalog.map(c => [c.id, c])));
      const active = plans.find(p => p.status === 'active');
      if (!live) return;
      if (!active) { setPlanDay(null); setSuggestionMap({}); setMissedNote(''); return; }
      setPlanDay((active.plan?.days || []).find(d => d.weekday === WDKEY[new Date().getDay()]) || null);
      const s = await getSuggestions({ feedback: JSON.stringify(map) }).catch(() => null);
      if (!live || !s) return;
      const m: Record<string, Suggestion> = {};
      (s.suggestions || []).forEach(x => { m[x.exerciseId] = x; });
      setSuggestionMap(m); setMissedNote(s.missedNote || '');
    }).catch(() => {});
    return () => { live = false; };
  }, [focused]);
  useEffect(() => { void loadProgressPrefs().then(p => setWorkoutPlan(p.workoutDays)); }, []);
  const togglePlanDay = async (day: number) => {
    const next = workoutPlan.includes(day) ? workoutPlan.filter(d => d !== day) : [...workoutPlan, day].sort();
    setWorkoutPlan(next);
    const p = await loadProgressPrefs();
    await saveProgressPrefs({ ...p, workoutDays: next });
    void syncReminderSchedules().catch(() => {});
  };
  const stopDetection = detection.stop;
  const [camera, setCamera] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [muscle, setMuscle] = useState<string | null>(null);
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
  const identity = useRef({ id: getSession()?.user.id, key: accountKey('fitness.workoutPreferences.v1'), fbKey: accountKey('fitness.workoutFeedback.v1') }).current;
  const ownAccount = () => !!identity.id && identity.id === getSession()?.user.id;
  const exercise = draft?.exerciseType || selected;
  const finished = !!draft?.session?.finishedAt;
  const currentFeedback = fb[exercise]?.sessionId === draft?.session?.id ? fb[exercise] : undefined;
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
  // Idle-workout check-in: if a draft is open with no set saved for 30 min,
  // nudge once. Rescheduled on each logged set; canceled on finish/clear.
  const IDLE_ID = 'humai-reminder:workout-idle';
  useEffect(() => {
    const cancel = () => Notifications.cancelScheduledNotificationAsync(IDLE_ID).catch(() => {});
    if (!draft || finished) { void cancel(); return; }
    const lastActivity = Math.max(Date.parse(draft.startedAt), ...(draft.session?.sets || []).map(s => Date.parse(s.timestamp) || 0));
    const fireInMs = Math.max(1000, lastActivity + 30 * 60000 - Date.now());
    void cancel();
    void Notifications.scheduleNotificationAsync({
      identifier: IDLE_ID,
      content: { title: 'Workout still in progress', body: 'Log a set, or finish or cancel the workout when you are done.', data: { deepLink: 'LogExercise' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.ceil(fireInMs / 1000) },
    }).catch(() => {});
    return () => { /* keep scheduled while app runs in background */ };
  }, [draft, finished, sets.length]);
  // Restore an interrupted set, otherwise reuse the last saved weight. Never overwrite edits with late history.
  useEffect(() => {
    if (!draft) return;
    const last = draft.pending || draft.session?.sets.at(-1);
    if (last && Number.isFinite(last.weight) && !fieldDirty.current) { setReps(String(last.reps)); setWeight(String(displayWeight(last.weight, prefs.unit))); }
  }, [draft, prefs.unit]);
  useEffect(() => {
    if (camera && detection.reps > 0) setReps(String(detection.reps));
    // Prefill a detected/suggested weight on camera close — user reviews
    // units and value before saving; nothing writes itself.
    if (!camera && detection.suggestedWeightKg) setWeight(String(displayWeight(detection.suggestedWeightKg, prefs.unit)));
  }, [camera, detection.reps, detection.suggestedWeightKg, prefs.unit]);
  const savePreferences = async (next: Preferences) => {
    if (prefsBusy.current || !prefsReady || !ownAccount()) return;
    prefsBusy.current = true;
    try { await accountStorage.setItem(identity.key, JSON.stringify(next)); if (ownAccount()) { setPrefs(next); setLocalError(''); return true; } }
    catch { setLocalError('Could not save preferences. Please try again.'); }
    finally { prefsBusy.current = false; }
  };
  const [catalogMap, setCatalogMap] = useState<Record<string, CatalogExercise>>({});
  const choose = (type: string, template?: Template) => {
    setSelected(type); fieldDirty.current = false; setTargetSets(template?.sets || null);
    if (!catalogMap[type]) void listCatalog().then(list => { const m: Record<string, CatalogExercise> = {}; list.forEach(c => { m[c.id] = c; }); setCatalogMap(m); }).catch(() => {});
    const prior = history.find(s => s.exerciseType === type)?.sets.at(-1);
    const source = template || prior;
    setReps(String(source?.reps || 10)); setWeight(source && Number.isFinite(source.weight) ? String(displayWeight(source.weight, prefs.unit)) : '');
  };
  useEffect(() => {
    const start = route?.params?.start;
    if (typeof start === 'string' && start) { choose(start); navigation.setParams({ start: undefined }); }
  }, [route?.params?.start]);
  const changeUnit = async (unit: WeightUnit) => {
    if (locked || prefsBusy.current) return;
    const value = weight.trim() === '' ? '' : String(displayWeight(toPounds(Number(weight), prefs.unit), unit));
    if (await savePreferences({ ...prefs, unit })) { fieldDirty.current = true; setWeight(value); }
  };
  const saveSet = async () => {
    const ok = await workout.addSet(Number(reps), toPounds(Number(weight), prefs.unit));
    if (ok) { setRestUntil(Date.now() + (planDay?.exercises.find(e => e.exerciseId === exercise)?.restSec ?? 60) * 1000); setNow(Date.now()); fieldDirty.current = false; }
  };
  const closeCamera = async () => { setCamera(false); await detection.stop(); };
  const weightLabel = (value: number) => Number.isFinite(value) ? `${displayWeight(value, prefs.unit)} ${prefs.unit}` : 'weight not recorded';
  const previous = history.find(s => s.exerciseType === exercise && s.id !== draft?.id);
  const recent = [...new Set(history.map(s => s.exerciseType))].slice(0, 5);
  const candidates = [...new Set([...EXERCISE_TYPES, ...Object.keys(catalogMap)])].filter(t => exerciseName(t).toLowerCase().includes(query.toLowerCase()) &&
    (category === 'All' || (category === 'Favorites' ? prefs.favorites.includes(t) : categories[t] === category)) &&
    (!muscle || (catalogMap[t]?.muscle || []).map(m => m.toLowerCase()).includes(muscle)));
  return <>
    {camera && <PoseCameraScreen visible onClose={closeCamera} detection={detection} />}
    <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
      <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>{finished ? 'Workout review' : draft ? 'Workout in progress' : 'Workout'}</Copy>
      <Copy tone="muted">{draft ? exerciseName(exercise) : 'Choose an exercise. Build your workout one set at a time.'}</Copy>
      {loading && <Skeleton label="Restoring workout" />}
      {localError !== '' && <Notice title="Preferences unavailable" message={localError} error />}
      {error && <Notice title="Workout needs attention" message={error} error />}
      {!loading && !draft && <>
        <Card><ListRow title={planDay ? 'Personal workout plan' : 'Create my plan'} subtitle={planDay ? 'Review or adjust your confirmed plan' : 'No active plan — answer a few questions and get a draft you can edit before it starts'} onPress={() => navigation.navigate('WorkoutPlan')}><IconAction icon="›" label="Open workout plan" onPress={() => navigation.navigate('WorkoutPlan')} /></ListRow></Card>
        {planDay && <Card>
          <Copy size="heading">Today&rsquo;s planned session{planDay.focus ? ` — ${planDay.focus}` : ''}</Copy>
          {!!planDay.warmup?.length && <Copy tone="muted">Warm-up: {planDay.warmup.join(', ')}</Copy>}
          {!!planDay.cooldown?.length && <Copy tone="muted">Cool-down: {planDay.cooldown.join(', ')}</Copy>}
          {planDay.exercises.map(e => (
            <ListRow key={e.exerciseId} title={`${exerciseName(e.exerciseId)} — ${e.sets}×${e.reps}`}
              subtitle={suggestionMap[e.exerciseId] ? `${suggestionMap[e.exerciseId].direction} · ${suggestionMap[e.exerciseId].reason}` : undefined}>
              <IconAction icon="▶" label={`Start ${exerciseName(e.exerciseId)}`} disabled={!prefsReady || saving || !workout.ready} onPress={() => {
                choose(e.exerciseId);
                setTargetSets(e.sets); setReps(String(parseInt(e.reps, 10) || 10));
                setChecks({}); setFbSaved(false);
                void workout.start(e.exerciseId);
              }} />
            </ListRow>
          ))}
          {missedNote !== '' && <Copy tone="muted">{missedNote}</Copy>}
        </Card>}
        <Card><Field label="Search exercises" value={query} onChangeText={setQuery} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['All', 'Push', 'Pull', 'Legs', 'Favorites'].map(item => <Action key={item} label={item} secondary selected={category === item} onPress={() => setCategory(item)} />)}</View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Copy size="caption" tone="muted">Muscle group — filters the list below</Copy>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FeatureGate feature="voiceExerciseLogging"><VoiceInput context={{
                  lastExercise: selected || undefined,
                  lastWeight: sets.length ? sets.at(-1)!.weight : undefined,
                  weightUnit: prefs.unit,
                }} onDone={() => setRefresh(v => v + 1)} /></FeatureGate>
                <IconAction icon="🧍" label="Browse muscles" onPress={() => navigation.navigate('MuscleExplorer')} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {Object.entries(MUSCLE_LABELS).map(([key, label]) => <Action key={key} label={label} secondary selected={muscle === key} onPress={() => setMuscle(muscle === key ? null : key)} />)}
            </View>
          </View>
          <View style={{ marginTop: 4 }}>
            {candidates.map(type => { const fav = prefs.favorites.includes(type); return <View key={type}><ListRow
              title={exerciseName(type)} selected={selected === type} subtitle={selected === type ? 'Selected' : categories[type] || undefined}
              onPress={() => choose(type)}>
              <IconAction icon={fav ? '♥' : '♡'} label={fav ? `Remove favorite: ${exerciseName(type)}` : `Save favorite: ${exerciseName(type)}`}
                onPress={() => void savePreferences({ ...prefs, favorites: fav ? prefs.favorites.filter(t => t !== type) : [...prefs.favorites, type] })} />
            </ListRow>
            {selected === type && <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 8 }}>
              {catalogMap[type] && <MuscleMap muscles={catalogMap[type].muscle} />}
              {targetSets && <Copy tone="muted">{targetSets} planned sets</Copy>}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IconAction icon="🎥" label="Search on YouTube" onPress={() => void openYouTubeSearch(`${exerciseName(selected)} proper form`).then(ok => { if (!ok) setLocalError('Couldn’t open YouTube. Try searching in a browser.'); })} />
                <View style={{ flex: 1, minWidth: 0 }}><Action label="Start workout" disabled={!prefsReady || saving || !workout.ready} onPress={() => void workout.start(selected)} /></View>
              </View>
            </View>}
            </View>; })}
          </View>
          {!candidates.length && <Copy tone="muted">No matching exercises. Try another category or search.</Copy>}
          <View style={{ marginTop: 4 }}>
            <Copy size="caption" tone="muted">Planned training days (tap to toggle — other days count as planned rest)</Copy>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => <Action key={i} label={d} secondary={!workoutPlan.includes(i)} selected={workoutPlan.includes(i)} onPress={() => void togglePlanDay(i)} />)}
            </View>
          </View>
        </Card>
        {recent.length > 0 && <Card style={{ paddingVertical: 4 }}><Copy size="heading" style={{ paddingVertical: 12 }}>Recent exercises</Copy>{recent.map(type => <ListRow key={type} title={exerciseName(type)} onPress={() => choose(type)}><IconAction icon="↻" label={`Start ${exerciseName(type)}`} onPress={() => choose(type)} /></ListRow>)}</Card>}
        {prefs.templates.length > 0 && <Card><Copy size="heading">Your templates</Copy><Copy tone="muted">Single-exercise routines saved on this device. Sets are logged individually.</Copy>
          {prefs.templates.map(t => <ListRow key={t.name} title={`${t.name} · ${t.sets} sets of ${t.reps}`} onPress={() => choose(t.exerciseType, t)}>
            <IconAction icon="🗑" danger label={`Remove ${t.name}`} onPress={() => void savePreferences({ ...prefs, templates: prefs.templates.filter(x => x.name !== t.name) })} />
          </ListRow>)}
        </Card>}
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
        {checklist('warmup')}
        <Card><Copy size="heading">{clockText(elapsed(draft.startedAt, now))} elapsed</Copy>
          {targetSets && <Copy>{sets.length} of {targetSets} planned sets logged</Copy>}
          <Copy tone="muted">Your workout stays on this device while in progress. Saved sets are stored in your account.</Copy>
          {previous?.sets.length ? <Copy>Previous: {previous.sets.length} sets · last set {previous.sets.at(-1)!.reps} reps at {weightLabel(previous.sets.at(-1)!.weight)}</Copy> : <Copy tone="muted">No previous performance available.</Copy>}
          {!sets.length && previous?.sets.length && Number.isFinite(previous.sets.at(-1)!.weight) && <Action secondary label="Use previous set" disabled={locked} onPress={() => { const last = previous.sets.at(-1)!; setReps(String(last.reps)); setWeight(String(displayWeight(last.weight, prefs.unit))); fieldDirty.current = true; }} />}
          <View style={{ flexDirection: 'row', gap: 12 }}>{(['lb', 'kg'] as const).map(unit => <View key={unit} style={{ flex: 1 }}><Action label={unit} selected={prefs.unit === unit} secondary={prefs.unit !== unit} disabled={locked || !prefsReady} onPress={() => void changeUnit(unit)} /></View>)}</View>
          <Field label="Reps" value={reps} editable={!locked} keyboardType="number-pad" onChangeText={v => { fieldDirty.current = true; setReps(v); }} />
          <Field label={`Weight (${prefs.unit})`} value={weight} editable={!locked} keyboardType="decimal-pad" onChangeText={v => { fieldDirty.current = true; setWeight(v.replace(',', '.')); }} />
          <Copy tone="muted">Enter added weight only. Use 0 for bodyweight exercises.</Copy>
          {!draft.pending && <Action label={saving ? 'Saving set…' : `Log set ${sets.length + 1}`} disabled={locked || !weight.trim() || !!validateSet(Number(reps), toPounds(Number(weight), prefs.unit))} onPress={() => void saveSet()} />}
          {draft.pending && <><Notice title="Set awaiting confirmation" message="Your set is kept on this device. Reconnect and retry; the same set will not be logged twice." /><Action label="Retry saved set" disabled={saving} onPress={() => void saveSet()} /></>}
          {isEnabled('poseDetection') && <Action secondary label="Camera rep count and form" disabled={locked || detection.status === 'loading'} onPress={async () => { setCamera(true); await detection.start(exercise); }} />}
          <IconAction icon="🎥" label="Search on YouTube" disabled={locked} onPress={() => void openYouTubeSearch(`${exerciseName(exercise)} proper form`).then(ok => { if (!ok) setLocalError('Couldn’t open YouTube. Try searching in a browser.'); })} />
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
          <Copy size="caption" tone="muted">How did {exerciseName(exercise)} feel? Optional — improves your next plan suggestions. Stored on this device only.</Copy>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[0, 1, 2, 3].map(r => <Action key={r} label={r === 3 ? '3+ left' : `${r} left`} secondary={currentFeedback?.rir !== r} selected={currentFeedback?.rir === r} onPress={() => void saveFb(exercise, { rir: r })} />)}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Action label="No discomfort" secondary={currentFeedback?.discomfort !== false} selected={currentFeedback?.discomfort === false} onPress={() => void saveFb(exercise, { discomfort: false })} />
            <Action label="Some discomfort" secondary={currentFeedback?.discomfort !== true} selected={currentFeedback?.discomfort === true} onPress={() => void saveFb(exercise, { discomfort: true })} />
          </View>
          {fbSaved && <Copy tone="primary">Saved — future suggestions account for this.</Copy>}
          <Field label="Template name" value={templateName} maxLength={60} onChangeText={setTemplateName} />
          <Action secondary label="Save as template" disabled={!templateName.trim() || !prefsReady} onPress={() => { const last = sets.at(-1)!; void savePreferences({ ...prefs, templates: [...prefs.templates.filter(t => t.name !== templateName.trim()), { name: templateName.trim(), exerciseType: exercise, reps: last.reps, weight: last.weight, sets: sets.length }].slice(-20) }); }} />
          {prefs.templates.some(t => t.name === templateName.trim()) && <Copy>Template saved on this device.</Copy>}
          <Action label="Done" disabled={saving} onPress={async () => { if (await workout.clear()) { setRestUntil(null); setTargetSets(null); } }} />
        </> : <>
          {!!sets.length && <Action label={draft.finishing ? 'Retry finishing workout' : 'Finish workout'} disabled={saving || !!draft.pending} onPress={async () => { await closeCamera(); await workout.finish(); }} />}
          {!sets.length && !draft.pending && <Action secondary label="Cancel empty workout" disabled={saving} onPress={() => void workout.clear()} />}
        </>}
      </Card>}
      {finished && checklist('cooldown')}
    </KeyboardAwareScrollView>
  </>;
}
