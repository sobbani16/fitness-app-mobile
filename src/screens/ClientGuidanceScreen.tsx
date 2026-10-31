import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  getMyNutritionPlan,
  listMyNutritionPlans,
  logNutritionMeal,
  NutritionAssignment,
  NutritionPlanItem,
  respondToNutritionPlan,
  sendNutritionFeedback,
} from '../api/trainerNutrition';
import { Action, Card, Copy, Field, ListRow, Notice, Sheet, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Chip from '../components/Chip';
import StatTile from '../components/StatTile';
import EmptyState from '../components/ui-states/EmptyState';

const FALLBACK_DISCLAIMER = 'General fitness nutrition guidance — not medical nutrition therapy.';

function itemLabel(item: NutritionPlanItem): string {
  const name = item.name || item.foodName || 'Item';
  const bits = [`${item.quantityG}g`];
  if (item.nutrition?.calories != null) bits.push(`${Math.round(item.nutrition.calories)} kcal`);
  if (item.resolvable === false) bits.push('no nutrition data');
  return `${name} · ${bits.join(' · ')}`;
}

export default function ClientGuidanceScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const paramId: string | undefined = route.params?.assignmentId;

  const [assignments, setAssignments] = useState<NutritionAssignment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(paramId ?? null);
  const [detail, setDetail] = useState<NutritionAssignment | null>(null);
  const [disclaimer, setDisclaimer] = useState(FALLBACK_DISCLAIMER);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loggingMeal, setLoggingMeal] = useState<string | null>(null);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');

  const loadList = useCallback(async () => {
    if (assignments.length === 0) setLoading(true);
    setError(null);
    try {
      const data = await listMyNutritionPlans();
      setAssignments(data.assignments);
      if (data.disclaimer) setDisclaimer(data.disclaimer);
      const current = selectedId || data.assignments[0]?.id || null;
      setSelectedId(current);
      if (current) await loadDetail(current);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Could not load nutrition guidance.');
    } finally {
      setLoading(false);
    }
  }, [selectedId, assignments.length]);

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    setActionError(null);
    setNotice(null);
    try {
      const data = await getMyNutritionPlan(id);
      setDetail(data);
      if (data.disclaimer) setDisclaimer(data.disclaimer);
    } catch (e: any) {
      setDetail(null);
      setActionError(e.response?.data?.error || e.message || 'Could not load the plan.');
    } finally {
      setDetailLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { void loadList(); }, [loadList]));

  const respond = async (action: 'accept' | 'decline') => {
    if (!detail) return;
    setBusy(true);
    setActionError(null);
    try {
      const result = await respondToNutritionPlan(detail.id, action);
      setDetail({ ...detail, status: result.assignment.status, respondedAt: result.assignment.respondedAt });
    } catch (e: any) {
      setActionError(e.response?.data?.error || e.message || 'The response could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  const logMeal = async (mealId: string) => {
    if (!detail) return;
    setLoggingMeal(mealId);
    setActionError(null);
    setNotice(null);
    try {
      const result = await logNutritionMeal(detail.id, { mealId });
      setNotice(`Logged ${result.logs.length} item${result.logs.length === 1 ? '' : 's'} to your food diary.`);
    } catch (e: any) {
      const msg = e.response?.data?.error || e.message || 'This meal could not be logged.';
      const items = e.response?.data?.items;
      setActionError(items?.length ? `${msg} Missing nutrition for: ${items.map((i: any) => i.item).join(', ')}.` : msg);
    } finally {
      setLoggingMeal(null);
    }
  };

  const submitFeedback = async () => {
    if (!detail || (!rating && !note.trim())) { setActionError('Add a rating or a note first.'); return; }
    setBusy(true);
    setActionError(null);
    try {
      await sendNutritionFeedback(detail.id, { ...(rating ? { rating } : {}), ...(note.trim() ? { note: note.trim() } : {}) });
      setFeedbackOpen(false);
      setRating(0);
      setNote('');
      setNotice('Feedback sent to your coach.');
    } catch (e: any) {
      setActionError(e.response?.data?.error || e.message || 'Feedback could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, gap: 16 }}>
        <Skeleton label="Loading nutrition guidance" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24, gap: 12 }}>
        <Notice error title="Could not load guidance" message={error} />
        <Action label="Retry" onPress={() => void loadList()} />
      </View>
    );
  }

  if (assignments.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 }}>
        <EmptyState title="No nutrition guidance" description="When your coach shares nutrition guidance it will appear here." />
      </View>
    );
  }

  const plan = detail?.plan;
  const status = detail?.status || 'assigned';
  const conflicts = detail?.allergyConflicts || [];
  const targets = plan?.targets || null;
  const targetTiles = targets
    ? ([
        ['Calories', targets.caloriesKcal, 'kcal'],
        ['Protein', targets.proteinG, 'g'],
        ['Carbs', targets.carbsG, 'g'],
        ['Fat', targets.fatG, 'g'],
        ['Fiber', targets.fiberG, 'g'],
        ['Water', targets.waterMl, 'ml'],
      ] as [string, number | null | undefined, string][]).filter(([, v]) => v != null)
    : [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
      <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Nutrition guidance</Copy>

      {assignments.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {assignments.map((a) => (
              <Chip key={a.id} label={`${a.plan?.title || 'Plan'} · ${a.status}`} selected={a.id === selectedId}
                accessibilityLabel={`Plan ${a.plan?.title || ''}, ${a.status}`}
                onPress={() => { setSelectedId(a.id); void loadDetail(a.id); }} />
            ))}
          </View>
        </ScrollView>
      )}

      <Notice title="Read first" message={disclaimer} />

      {conflicts.length > 0 && (
        <Notice error title="Possible allergy conflicts"
          message={`Review these items with your coach before eating them:\n${conflicts.map((c) => `• ${c.item} (${c.mealType}) — may contain ${c.allergen}`).join('\n')}`} />
      )}

      {!!actionError && <Card><Notice error title="Something went wrong" message={actionError} /></Card>}
      {!!notice && <Card><Notice title="Done" message={notice} /></Card>}

      {detailLoading && <Skeleton label="Loading plan details" />}

      {detail && plan && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Copy size="heading" style={{ fontWeight: '700' }}>{plan.title}</Copy>
              <Copy size="caption" tone="muted">Version {plan.version} · assigned {new Date(detail.assignedAt).toLocaleDateString()}</Copy>
            </View>
            <Chip small label={status} accessibilityLabel={`Status: ${status}`} />
          </View>

          {!!plan.guidanceText && (
            <Card><Copy style={{ fontWeight: '600' }}>How to follow this</Copy><Copy tone="muted">{plan.guidanceText}</Copy></Card>
          )}

          {targetTiles.length > 0 && (
            <Card>
              <Copy style={{ fontWeight: '700' }}>Daily targets</Copy>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {targetTiles.map(([label, value, unit]) => (
                  <StatTile key={label} label={label} value={`${value}${unit === 'kcal' ? '' : unit}`} />
                ))}
              </View>
              {plan.complete === false && <Copy size="caption" tone="muted">Some meal items have no nutrition data, so totals may be incomplete.</Copy>}
            </Card>
          )}

          {status === 'assigned' && (
            <Card>
              <Copy style={{ fontWeight: '600' }}>Your coach shared this guidance with you.</Copy>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><Action label="Accept" disabled={busy} onPress={() => void respond('accept')} /></View>
                <View style={{ flex: 1 }}><Action secondary label="Decline" disabled={busy} onPress={() => void respond('decline')} /></View>
              </View>
            </Card>
          )}

          {(plan.meals || []).map((meal) => (
            <Card key={meal.id || meal.mealType}>
              <Copy style={{ fontWeight: '700' }}>
                {meal.mealType[0].toUpperCase() + meal.mealType.slice(1)}{meal.timing ? ` · ${meal.timing}` : ''}
              </Copy>
              {meal.items.map((item, i) => (
                <ListRow key={item.id || i} title={item.name || item.foodName || 'Item'} subtitle={itemLabel(item)} />
              ))}
              {!!meal.notes && <Copy size="caption" tone="muted">{meal.notes}</Copy>}
              {!!meal.totals?.calories && <Copy size="caption" tone="muted">≈ {Math.round(meal.totals.calories)} kcal</Copy>}
              {(status === 'assigned' || status === 'accepted') && (
                <Action secondary label={loggingMeal === meal.id ? 'Logging…' : 'Log this meal'} disabled={loggingMeal !== null}
                  hint="Copies these items into your food diary."
                  onPress={() => meal.id && void logMeal(meal.id)} />
              )}
            </Card>
          ))}

          {(status === 'assigned' || status === 'accepted') && (
            <Action secondary label="Send feedback to your coach" onPress={() => setFeedbackOpen(true)} />
          )}
        </>
      )}
      {!detail && !detailLoading && !actionError && (
        <EmptyState title="Pick a plan" description="Choose one of the assigned plans above." />
      )}

      <Sheet visible={feedbackOpen} title="Feedback for your coach" onClose={() => setFeedbackOpen(false)}>
        <Copy>How is this guidance working for you?</Copy>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5].map((r) => (
            <Chip key={r} label={rating === r ? `★ ${r}` : `${r}`} selected={rating === r}
              accessibilityLabel={`Rate ${r} out of 5`} onPress={() => setRating(r)} />
          ))}
        </View>
        <Field label="Note" value={note} onChangeText={setNote} multiline maxLength={2000}
          placeholder="Anything your coach should know." />
        <Action label={busy ? 'Sending…' : 'Send feedback'} disabled={busy} onPress={() => void submitFeedback()} />
      </Sheet>
    </ScrollView>
  );
}
