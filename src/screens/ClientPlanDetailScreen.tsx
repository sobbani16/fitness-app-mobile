import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import {
  completeWorkoutPlan,
  getMyWorkoutPlan,
  respondToWorkoutPlan,
  sendWorkoutPlanFeedback,
  TrainerPlanDay,
  WorkoutPlanAssignment,
} from '../api/trainerPlans';
import { listSessions } from '../api/exercises';
import { ExerciseSession } from '../types/exercise';
import { Action, Card, Copy, Field, ListRow, Notice, Sheet, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Chip from '../components/Chip';
import StarRating from '../components/StarRating';

function exerciseLine(e: TrainerPlanDay['exercises'][number]): string {
  const bits = [`${e.sets} × ${e.reps != null ? e.reps : e.repsText || '?'}`];
  if (e.targetWeight != null) bits.push(`@ ${e.targetWeight}`);
  if (e.weightGuidance) bits.push(e.weightGuidance);
  if (e.restSeconds != null) bits.push(`${e.restSeconds}s rest`);
  if (e.tempo) bits.push(`tempo ${e.tempo}`);
  if (e.progression) bits.push(e.progression);
  return bits.join(' · ');
}

export default function ClientPlanDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const assignmentId: string = route.params?.assignmentId;

  const [assignment, setAssignment] = useState<WorkoutPlanAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');

  const [completeOpen, setCompleteOpen] = useState(false);
  const [sessions, setSessions] = useState<ExerciseSession[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyWorkoutPlan(assignmentId);
      setAssignment(data);
      const indices = (data.plan?.days || []).map((d) => d.dayIndex);
      if (indices.length) setDayIndex((current) => (indices.includes(current) ? current : Math.min(...indices)));
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Could not load the plan.');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const respond = async (action: 'accept' | 'decline') => {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await respondToWorkoutPlan(assignmentId, action);
      setAssignment((prev) => (prev ? { ...prev, status: updated.status, respondedAt: updated.respondedAt } : prev));
    } catch (e: any) {
      setActionError(e.response?.data?.error || e.message || 'The response could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  const submitFeedback = async () => {
    if (!rating && !note.trim()) { setActionError('Add a rating or a note first.'); return; }
    setBusy(true);
    setActionError(null);
    try {
      await sendWorkoutPlanFeedback(assignmentId, { ...(rating ? { rating } : {}), ...(note.trim() ? { note: note.trim() } : {}) });
      setFeedbackOpen(false);
      setRating(0);
      setNote('');
      setNotice('Feedback sent to your coach.');
      void load();
    } catch (e: any) {
      setActionError(e.response?.data?.error || e.message || 'Feedback could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  const openComplete = async () => {
    setCompleteOpen(true);
    setSessions(null);
    setSessionsError(null);
    try {
      const all = await listSessions();
      setSessions(all.slice(0, 20));
    } catch (e: any) {
      setSessionsError(e.response?.data?.error || e.message || 'Could not load recent workouts.');
      setSessions([]);
    }
  };

  const complete = async (sessionId: string) => {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await completeWorkoutPlan(assignmentId, sessionId);
      setAssignment((prev) => (prev ? { ...prev, status: updated.status } : prev));
      setCompleteOpen(false);
      setNotice('Plan marked complete. Nice work.');
    } catch (e: any) {
      setActionError(e.response?.data?.error || e.message || 'Could not mark the plan complete.');
      setCompleteOpen(false);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, gap: 16 }}>
        <Skeleton label="Loading your plan" />
      </View>
    );
  }

  if (error || !assignment) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24, gap: 12 }}>
        <Notice error title="Could not load plan" message={error || 'Plan not found.'} />
        <Action label="Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const plan = assignment.plan;
  const days = [...(plan?.days || [])].sort((a, b) => a.dayIndex - b.dayIndex);
  const day = days.find((d) => d.dayIndex === dayIndex) || days[0];
  const status = assignment.status;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>{plan?.title || 'Workout plan'}</Copy>
        </View>
        <Chip small label={status} accessibilityLabel={`Status: ${status}`} />
      </View>
      <Copy tone="muted">
        {plan?.trainer?.displayName ? `Coach ${plan.trainer.displayName} · ` : ''}Version {plan?.version ?? 1}
        {plan?.difficulty ? ` · ${plan.difficulty}` : ''}
        {plan?.durationWeeks ? ` · ${plan.durationWeeks} weeks` : ''}
        {plan?.daysPerWeek ? ` · ${plan.daysPerWeek} days/week` : ''}
      </Copy>
      {!!plan?.goal && <Copy>Goal: {plan.goal}</Copy>}
      {!!plan?.description && <Copy tone="muted">{plan.description}</Copy>}

      {!!actionError && <Card><Notice error title="Something went wrong" message={actionError} /></Card>}
      {!!notice && <Card><Notice title="Done" message={notice} /></Card>}

      {status === 'assigned' && (
        <Card>
          <Copy style={{ fontWeight: '600' }}>Your coach assigned this plan.</Copy>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Action label="Accept plan" disabled={busy} onPress={() => void respond('accept')} /></View>
            <View style={{ flex: 1 }}><Action secondary label="Decline" disabled={busy} onPress={() => void respond('decline')} /></View>
          </View>
        </Card>
      )}

      {status === 'accepted' && (
        <Card>
          <Action label="Start workout" hint="Opens the workout logger — your session can be linked back to this plan."
            onPress={() => navigation.navigate('Main', { screen: 'LogExercise' })} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Action secondary label="Send feedback" onPress={() => setFeedbackOpen(true)} /></View>
            <View style={{ flex: 1 }}><Action secondary label="Mark complete" disabled={busy} onPress={() => void openComplete()} /></View>
          </View>
        </Card>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {days.map((d) => (
            <Chip key={d.dayIndex} label={`Day ${d.dayIndex + 1}${d.label ? ` · ${d.label}` : ''}`}
              selected={(day?.dayIndex ?? days[0]?.dayIndex) === d.dayIndex}
              accessibilityLabel={`Day ${d.dayIndex + 1}${d.label ? `, ${d.label}` : ''}`}
              onPress={() => setDayIndex(d.dayIndex)} />
          ))}
        </View>
      </ScrollView>

      {day && (
        <Card>
          <Copy size="heading" accessibilityRole="header">{day.label || `Day ${day.dayIndex + 1}`}</Copy>
          {!!day.warmup && <Copy tone="muted">Warm-up: {day.warmup}</Copy>}
          {day.exercises.length === 0 && <Copy tone="muted">No exercises on this day.</Copy>}
          {day.exercises.map((e, i) => (
            <ListRow key={i} title={e.exerciseName} subtitle={exerciseLine(e)} />
          ))}
          {!!day.cooldown && <Copy tone="muted">Cool-down: {day.cooldown}</Copy>}
          {!!day.notes && <Copy tone="muted">{day.notes}</Copy>}
        </Card>
      )}

      {status === 'completed' && (
        <Card>
          <Copy style={{ fontWeight: '600' }}>Plan completed.</Copy>
          {(assignment.sessions || []).length > 0 && (
            <Copy tone="muted">{(assignment.sessions || []).length} linked workout session{(assignment.sessions || []).length === 1 ? '' : 's'}.</Copy>
          )}
          <Action secondary label="Send feedback" onPress={() => setFeedbackOpen(true)} />
        </Card>
      )}

      {(assignment.feedback || []).length > 0 && (
        <Card>
          <Copy style={{ fontWeight: '700' }}>Your feedback</Copy>
          {(assignment.feedback || []).map((f) => (
            <View key={f.id} style={{ gap: 2 }}>
              {f.rating != null && <StarRating rating={f.rating} />}
              {!!f.note && <Copy tone="muted">{f.note}</Copy>}
            </View>
          ))}
        </Card>
      )}

      {/* Feedback sheet */}
      <Sheet visible={feedbackOpen} title="Feedback for your coach" onClose={() => setFeedbackOpen(false)}>
        <Copy>How hard did this plan feel?</Copy>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5].map((r) => (
            <Chip key={r} label={rating === r ? `★ ${r}` : `${r}`} selected={rating === r}
              accessibilityLabel={`Rate difficulty ${r} out of 5`} onPress={() => setRating(r)} />
          ))}
        </View>
        <Field label="Note" value={note} onChangeText={setNote} multiline maxLength={2000}
          placeholder="Anything your coach should know — soreness, skipped moves, wins." />
        <Action label={busy ? 'Sending…' : 'Send feedback'} disabled={busy} onPress={() => void submitFeedback()} />
      </Sheet>

      {/* Session picker for completion */}
      <Sheet visible={completeOpen} title="Link a workout session" onClose={() => setCompleteOpen(false)}>
        <Copy tone="muted">Pick the session that completed this plan — it gets linked so your coach can see it.</Copy>
        {!!sessionsError && <Notice error title="Could not load sessions" message={sessionsError} />}
        {sessions === null && !sessionsError && <Skeleton label="Loading recent workouts" />}
        {sessions !== null && sessions.length === 0 && !sessionsError && (
          <Copy tone="muted">No logged workouts yet. Log a session first, then come back to mark the plan complete.</Copy>
        )}
        {(sessions || []).map((s) => (
          <ListRow key={s.id} title={s.exerciseType}
            subtitle={`${new Date(s.createdAt).toLocaleString()} · ${s.sets.length} set${s.sets.length === 1 ? '' : 's'}${s.finishedAt ? '' : ' · in progress'}`}
            onPress={() => void complete(s.id)} />
        ))}
      </Sheet>
    </ScrollView>
  );
}
