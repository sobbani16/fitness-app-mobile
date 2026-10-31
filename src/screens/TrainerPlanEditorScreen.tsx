import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  assignWorkoutPlan,
  createWorkoutPlan,
  getWorkoutPlan,
  getWorkoutPlanProgress,
  publishWorkoutPlan,
  reviseWorkoutPlan,
  TrainerPlanDay,
  TrainerPlanExercise,
  PlanProgress,
  updateWorkoutPlan,
} from '../api/trainerPlans';
import { getMyClients, TrainerClient } from '../api/trainers';
import { Action, Card, Copy, Field, IconAction, ListRow, Notice, Segmented, Sheet, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Chip from '../components/Chip';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';

type ClientRow = TrainerClient & { clientName?: string };

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

function toInt(text: string): number | null {
  const t = text.trim();
  return /^\d+$/.test(t) ? parseInt(t, 10) : null;
}

function toNum(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(text: string): string | null {
  const t = text.trim();
  return t ? t : null;
}

interface ExerciseDraft {
  exerciseName: string;
  sets: string;
  reps: string;
  targetWeight: string;
  weightGuidance: string;
  restSeconds: string;
  tempo: string;
  progression: string;
}

const EMPTY_EXERCISE: ExerciseDraft = {
  exerciseName: '', sets: '', reps: '', targetWeight: '', weightGuidance: '', restSeconds: '', tempo: '', progression: '',
};

export default function TrainerPlanEditorScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const routePlanId: string | undefined = route.params?.planId;

  const [planId, setPlanId] = useState<string | null>(routePlanId ?? null);
  const [status, setStatus] = useState<string>('draft');
  const [version, setVersion] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [difficulty, setDifficulty] = useState<'unset' | (typeof DIFFICULTIES)[number]>('unset');
  const [durationWeeks, setDurationWeeks] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('');
  const [days, setDays] = useState<TrainerPlanDay[]>([]);

  const [loading, setLoading] = useState(!!routePlanId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'publish' | 'revise' | null>(null);

  const [dayEditor, setDayEditor] = useState<number | null>(null); // index into days
  const [exerciseDraft, setExerciseDraft] = useState<ExerciseDraft | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState<number | null>(null); // null = new

  const [assignOpen, setAssignOpen] = useState(false);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const [progress, setProgress] = useState<PlanProgress | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);

  const editable = status === 'draft';
  const maxDayIndex = (toInt(daysPerWeek) ?? 7) - 1;

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const plan = await getWorkoutPlan(id);
      setPlanId(plan.id);
      setStatus(plan.status);
      setVersion(plan.version);
      setTitle(plan.title);
      setDescription(plan.description || '');
      setGoal(plan.goal || '');
      setDifficulty((DIFFICULTIES as readonly string[]).includes(plan.difficulty || '') ? (plan.difficulty as typeof DIFFICULTIES[number]) : 'unset');
      setDurationWeeks(plan.durationWeeks ? String(plan.durationWeeks) : '');
      setDaysPerWeek(plan.daysPerWeek ? String(plan.daysPerWeek) : '');
      setDays([...(plan.days || [])].sort((a, b) => a.dayIndex - b.dayIndex));
    } catch (e: any) {
      setLoadError(e.response?.data?.error || e.message || 'Could not load the plan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (routePlanId) void load(routePlanId); }, [routePlanId, load]);

  const payloadDays = () => days.map((d) => ({
    dayIndex: d.dayIndex,
    label: strOrNull(d.label || ''),
    warmup: strOrNull(d.warmup || ''),
    cooldown: strOrNull(d.cooldown || ''),
    notes: strOrNull(d.notes || ''),
    exercises: d.exercises.map((e, i) => ({
      exerciseName: e.exerciseName,
      exerciseId: e.exerciseId ?? null,
      sets: e.sets,
      reps: e.reps ?? null,
      repsText: e.repsText ?? null,
      targetWeight: e.targetWeight ?? null,
      weightGuidance: e.weightGuidance ?? null,
      restSeconds: e.restSeconds ?? null,
      tempo: e.tempo ?? null,
      progression: e.progression ?? null,
      order: i,
    })),
  }));

  const payload = () => ({
    title: title.trim(),
    description: strOrNull(description),
    goal: strOrNull(goal),
    difficulty: difficulty === 'unset' ? null : difficulty,
    durationWeeks: toInt(durationWeeks),
    daysPerWeek: toInt(daysPerWeek),
    days: payloadDays(),
  });

  const validate = (): string | null => {
    if (!title.trim()) return 'Give the plan a title.';
    if (durationWeeks.trim() && toInt(durationWeeks) === null) return 'Duration must be a whole number of weeks.';
    if (daysPerWeek.trim() && toInt(daysPerWeek) === null) return 'Days per week must be a whole number.';
    for (const d of days) {
      if (d.dayIndex > maxDayIndex) return `Day ${d.dayIndex + 1} exceeds the days-per-week setting. Raise days per week or remove the day.`;
    }
    return null;
  };

  const save = async (): Promise<string | null> => {
    const problem = validate();
    if (problem) { setError(problem); return null; }
    setBusy('save');
    setError(null);
    setNotice(null);
    try {
      const saved = planId
        ? await updateWorkoutPlan(planId, payload())
        : await createWorkoutPlan(payload());
      setPlanId(saved.id);
      setStatus(saved.status);
      setVersion(saved.version);
      setNotice('Draft saved.');
      return saved.id;
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'The plan could not be saved.');
      return null;
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    const id = planId || (await save());
    if (!id) return;
    setBusy('publish');
    setError(null);
    setNotice(null);
    try {
      const saved = await updateWorkoutPlan(id, payload());
      const published = await publishWorkoutPlan(saved.id);
      setStatus(published.status);
      setVersion(published.version);
      setNotice('Published. You can now assign this plan to a client.');
      openAssign();
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'The plan could not be published.');
    } finally {
      setBusy(null);
    }
  };

  const revise = async () => {
    if (!planId) return;
    setBusy('revise');
    setError(null);
    try {
      const draft = await reviseWorkoutPlan(planId);
      await load(draft.id);
      setNotice(`Version ${draft.version} draft created. The previous version was archived.`);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'A new draft could not be created.');
    } finally {
      setBusy(null);
    }
  };

  const openAssign = async () => {
    setAssignOpen(true);
    setClientsError(null);
    try {
      const data = await getMyClients();
      setClients((data.clients || []) as ClientRow[]);
    } catch (e: any) {
      setClientsError(e.response?.data?.error || e.message || 'Could not load clients.');
    }
  };

  const assign = async (client: ClientRow) => {
    if (!planId) return;
    setAssigning(client.clientId);
    try {
      await assignWorkoutPlan(planId, client.clientId);
      setNotice(`Assigned to ${client.clientName || 'client'}.`);
      setAssignOpen(false);
    } catch (e: any) {
      setClientsError(e.response?.data?.error || e.message || 'The plan could not be assigned.');
    } finally {
      setAssigning(null);
    }
  };

  const openProgress = async () => {
    if (!planId) return;
    setProgressOpen(true);
    try {
      setProgress(await getWorkoutPlanProgress(planId));
    } catch {
      setProgress(null);
    }
  };

  // --- day + exercise editing -------------------------------------------------

  const addDay = () => {
    const used = new Set(days.map((d) => d.dayIndex));
    let next = -1;
    for (let i = 0; i <= Math.max(maxDayIndex, 0); i += 1) if (!used.has(i)) { next = i; break; }
    if (next < 0) return;
    setDays([...days, { dayIndex: next, label: '', exercises: [] }]);
  };

  const updateDay = (index: number, patch: Partial<TrainerPlanDay>) => {
    setDays(days.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const moveExercise = (dayIdx: number, exIdx: number, dir: -1 | 1) => {
    const day = days[dayIdx];
    const target = exIdx + dir;
    if (!day || target < 0 || target >= day.exercises.length) return;
    const exercises = [...day.exercises];
    [exercises[exIdx], exercises[target]] = [exercises[target], exercises[exIdx]];
    updateDay(dayIdx, { exercises });
  };

  const openExerciseEditor = (exIdx: number | null) => {
    setExerciseIndex(exIdx);
    if (exIdx === null || dayEditor === null) {
      setExerciseDraft({ ...EMPTY_EXERCISE });
    } else {
      const e = days[dayEditor].exercises[exIdx];
      setExerciseDraft({
        exerciseName: e.exerciseName,
        sets: String(e.sets),
        reps: e.reps != null ? String(e.reps) : (e.repsText || ''),
        targetWeight: e.targetWeight != null ? String(e.targetWeight) : '',
        weightGuidance: e.weightGuidance || '',
        restSeconds: e.restSeconds != null ? String(e.restSeconds) : '',
        tempo: e.tempo || '',
        progression: e.progression || '',
      });
    }
  };

  const saveExercise = () => {
    if (dayEditor === null || !exerciseDraft) return;
    const name = exerciseDraft.exerciseName.trim();
    const sets = toInt(exerciseDraft.sets);
    const repsRaw = exerciseDraft.reps.trim();
    const repsNum = /^\d+$/.test(repsRaw) ? parseInt(repsRaw, 10) : null;
    if (!name) { setError('Give the exercise a name.'); return; }
    if (sets === null || sets < 1) { setError('Sets must be a whole number of at least 1.'); return; }
    if (!repsRaw) { setError('Add reps — a number (10) or a range (8-12).'); return; }
    const exercise: TrainerPlanExercise = {
      exerciseName: name,
      sets,
      reps: repsNum,
      repsText: repsNum === null ? repsRaw : null,
      targetWeight: toNum(exerciseDraft.targetWeight),
      weightGuidance: strOrNull(exerciseDraft.weightGuidance),
      restSeconds: toInt(exerciseDraft.restSeconds),
      tempo: strOrNull(exerciseDraft.tempo),
      progression: strOrNull(exerciseDraft.progression),
    };
    const day = days[dayEditor];
    const exercises = [...day.exercises];
    if (exerciseIndex === null) exercises.push(exercise);
    else exercises[exerciseIndex] = exercise;
    updateDay(dayEditor, { exercises });
    setExerciseDraft(null);
    setExerciseIndex(null);
    setError(null);
  };

  // --- render -----------------------------------------------------------------

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, gap: 16 }}>
        <Skeleton label="Loading workout plan" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24, gap: 12 }}>
        <Notice error title="Could not load plan" message={loadError} />
        <Action label="Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const editingDay = dayEditor !== null ? days[dayEditor] : null;

  return (
    <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
      <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>
        {planId ? 'Edit workout plan' : 'New workout plan'}
      </Copy>
      <Copy tone="muted">
        {planId ? `Version ${version} · ${status}` : 'Saved as a draft until you publish.'}
      </Copy>

      {!editable && (
        <Card>
          <Notice title={`This plan is ${status}`}
            message={status === 'published'
              ? 'Published plans are locked. Revise to create a new draft version, or assign it to a client.'
              : 'Archived plans are read-only.'} />
          {status === 'published' && <Action label={busy === 'revise' ? 'Creating draft…' : 'Revise to a new draft'} disabled={busy !== null} onPress={() => void revise()} />}
          {status === 'published' && <Action secondary label="Assign to a client" onPress={() => void openAssign()} />}
        </Card>
      )}

      <Card>
        <Field label="Title" value={title} editable={editable} onChangeText={setTitle} placeholder="e.g. 4-week strength base" maxLength={200} />
        <Field label="Description" value={description} editable={editable} onChangeText={setDescription} multiline maxLength={2000} placeholder="Who this plan is for and how it works" />
        <Field label="Goal" value={goal} editable={editable} onChangeText={setGoal} maxLength={200} placeholder="e.g. Build foundational strength" />
        <Segmented label="Difficulty" value={difficulty} onChange={setDifficulty}
          options={[{ value: 'unset', label: 'Not set' }, ...DIFFICULTIES.map((d) => ({ value: d, label: d[0].toUpperCase() + d.slice(1) }))]} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><Field label="Duration (weeks)" value={durationWeeks} editable={editable} onChangeText={setDurationWeeks} keyboardType="number-pad" placeholder="4" /></View>
          <View style={{ flex: 1 }}><Field label="Days per week" value={daysPerWeek} editable={editable} onChangeText={setDaysPerWeek} keyboardType="number-pad" placeholder="3" /></View>
        </View>
      </Card>

      <Card>
        <Copy size="heading" accessibilityRole="header">Training days</Copy>
        <Copy tone="muted">Each day covers one session. Days must fit inside the days-per-week setting.</Copy>
        {days.length === 0 && <Copy tone="muted">No days yet — add the first training day.</Copy>}
        {days.map((d, i) => (
          <ListRow key={`${d.dayIndex}-${i}`}
            title={`Day ${d.dayIndex + 1}${d.label ? ` — ${d.label}` : ''}`}
            subtitle={`${d.exercises.length} exercise${d.exercises.length === 1 ? '' : 's'}`}
            onPress={editable ? () => setDayEditor(i) : undefined}>
            {editable && <IconAction icon="✕" danger label={`Remove day ${d.dayIndex + 1}`} onPress={() => setDays(days.filter((_, x) => x !== i))} />}
          </ListRow>
        ))}
        {editable && (
          <Action secondary label="Add a day" disabled={days.length > maxDayIndex}
            hint={days.length > maxDayIndex ? 'Raise days per week to add more days.' : undefined}
            onPress={addDay} />
        )}
      </Card>

      {!!error && <Card><Notice error title="Could not continue" message={error} /></Card>}
      {!!notice && <Card><Notice title="Done" message={notice} /></Card>}

      {editable && (
        <>
          <Action label={busy === 'save' ? 'Saving…' : 'Save draft'} disabled={busy !== null} onPress={() => void save()} />
          <Action secondary label={busy === 'publish' ? 'Publishing…' : 'Save & publish'} disabled={busy !== null}
            hint="Publishing locks this version so it can be assigned to clients."
            onPress={() => void publish()} />
        </>
      )}
      {planId && status !== 'draft' && (
        <Action secondary label="View assignment progress" onPress={() => void openProgress()} />
      )}
      {planId && status === 'published' && (
        <Action secondary label="Assign to a client" onPress={() => void openAssign()} />
      )}

      {/* Per-day editor */}
      <Sheet visible={dayEditor !== null} title={editingDay ? `Day ${editingDay.dayIndex + 1}` : 'Day'} onClose={() => { setDayEditor(null); setExerciseDraft(null); }}>
        {editingDay && (
          <>
            <Field label="Day label" value={editingDay.label || ''} onChangeText={(v) => updateDay(dayEditor!, { label: v })} placeholder="e.g. Push day" maxLength={200} />
            <Field label="Warm-up" value={editingDay.warmup || ''} onChangeText={(v) => updateDay(dayEditor!, { warmup: v })} multiline maxLength={1000} placeholder="e.g. 5 min bike + band work" />
            <Field label="Cool-down" value={editingDay.cooldown || ''} onChangeText={(v) => updateDay(dayEditor!, { cooldown: v })} multiline maxLength={1000} />
            <Field label="Notes" value={editingDay.notes || ''} onChangeText={(v) => updateDay(dayEditor!, { notes: v })} multiline maxLength={2000} />
            <Copy style={{ fontWeight: '700' }}>Exercises</Copy>
            {editingDay.exercises.length === 0 && <Copy tone="muted">No exercises yet.</Copy>}
            {editingDay.exercises.map((e, i) => (
              <ListRow key={i}
                title={e.exerciseName}
                subtitle={`${e.sets} × ${e.reps != null ? e.reps : e.repsText || '?'}${e.weightGuidance ? ` · ${e.weightGuidance}` : ''}${e.restSeconds != null ? ` · ${e.restSeconds}s rest` : ''}`}
                onPress={() => openExerciseEditor(i)}>
                <IconAction icon="↑" label={`Move ${e.exerciseName} up`} disabled={i === 0} onPress={() => moveExercise(dayEditor!, i, -1)} />
                <IconAction icon="↓" label={`Move ${e.exerciseName} down`} disabled={i === editingDay.exercises.length - 1} onPress={() => moveExercise(dayEditor!, i, 1)} />
                <IconAction icon="✕" danger label={`Remove ${e.exerciseName}`} onPress={() => updateDay(dayEditor!, { exercises: editingDay.exercises.filter((_, x) => x !== i) })} />
              </ListRow>
            ))}
            <Action secondary label="Add an exercise" onPress={() => openExerciseEditor(null)} />
          </>
        )}
      </Sheet>

      {/* Exercise editor */}
      <Sheet visible={exerciseDraft !== null} title={exerciseIndex === null ? 'Add exercise' : 'Edit exercise'} onClose={() => { setExerciseDraft(null); setExerciseIndex(null); }}>
        {exerciseDraft && (
          <>
            <Field label="Exercise name" value={exerciseDraft.exerciseName} onChangeText={(v) => setExerciseDraft({ ...exerciseDraft, exerciseName: v })} placeholder="e.g. Barbell squat" maxLength={200} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}><Field label="Sets" value={exerciseDraft.sets} onChangeText={(v) => setExerciseDraft({ ...exerciseDraft, sets: v })} keyboardType="number-pad" placeholder="3" /></View>
              <View style={{ flex: 1 }}><Field label="Reps" value={exerciseDraft.reps} onChangeText={(v) => setExerciseDraft({ ...exerciseDraft, reps: v })} placeholder="10 or 8-12" maxLength={50} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}><Field label="Target weight" value={exerciseDraft.targetWeight} onChangeText={(v) => setExerciseDraft({ ...exerciseDraft, targetWeight: v })} keyboardType="decimal-pad" placeholder="kg or lb" /></View>
              <View style={{ flex: 1 }}><Field label="Rest (seconds)" value={exerciseDraft.restSeconds} onChangeText={(v) => setExerciseDraft({ ...exerciseDraft, restSeconds: v })} keyboardType="number-pad" placeholder="90" /></View>
            </View>
            <Field label="Weight guidance" value={exerciseDraft.weightGuidance} onChangeText={(v) => setExerciseDraft({ ...exerciseDraft, weightGuidance: v })} placeholder="e.g. RPE 7, add 2.5kg weekly" maxLength={200} />
            <Field label="Tempo" value={exerciseDraft.tempo} onChangeText={(v) => setExerciseDraft({ ...exerciseDraft, tempo: v })} placeholder="e.g. 3-1-1" maxLength={50} />
            <Field label="Progression" value={exerciseDraft.progression} onChangeText={(v) => setExerciseDraft({ ...exerciseDraft, progression: v })} placeholder="e.g. +1 rep per session" maxLength={200} />
            <Action label="Save exercise" onPress={saveExercise} />
          </>
        )}
      </Sheet>

      {/* Assign to client */}
      <Sheet visible={assignOpen} title="Assign to a client" onClose={() => setAssignOpen(false)}>
        {!!clientsError && <Notice error title="Assignment problem" message={clientsError} />}
        {clients.length === 0 && !clientsError && <Copy tone="muted">Loading clients…</Copy>}
        {clients.filter((c) => c.status === 'active').length === 0 && clients.length > 0 && (
          <Copy tone="muted">No active clients. A plan can only be assigned while the coaching relationship is active.</Copy>
        )}
        {clients.filter((c) => c.status === 'active').map((c) => (
          <ListRow key={c.id} title={c.clientName || 'Client'} subtitle={`${c.daysWithTrainer ?? 0} days with you`}>
            <Action label={assigning === c.clientId ? 'Assigning…' : 'Assign'} disabled={assigning !== null} onPress={() => void assign(c)} />
          </ListRow>
        ))}
      </Sheet>

      {/* Progress */}
      <Sheet visible={progressOpen} title="Assignment progress" onClose={() => setProgressOpen(false)}>
        {!progress && <Skeleton label="Loading progress" />}
        {progress && progress.assignments.length === 0 && <Copy tone="muted">This plan has not been assigned yet.</Copy>}
        {progress && progress.assignments.map((a) => (
          <ListRow key={a.id} title={`Client ${a.clientId.slice(0, 8)}`} subtitle={`${a.status} · ${a.completedSessions} of ${a.plannedSessions ?? '?'} sessions completed`}>
            <Chip small label={a.status} accessibilityLabel={`Status ${a.status}`} />
          </ListRow>
        ))}
        {progress && progress.assignments.some((a) => !a.workoutRecordsConsent) && (
          <Copy size="caption" tone="muted">Session details are hidden for clients who have not consented to share workout records.</Copy>
        )}
      </Sheet>
    </KeyboardAwareScrollView>
  );
}
