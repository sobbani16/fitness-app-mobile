import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  archiveNutritionPlan,
  assignNutritionPlan,
  createNutritionPlan,
  getNutritionPlan,
  listNutritionPlans,
  NutritionPlanItem,
  NutritionPlanMeal,
  NutritionPreview,
  NutritionTargets,
  previewNutritionPlan,
  publishNutritionPlan,
  reviseNutritionPlan,
  TrainerNutritionPlan,
  updateNutritionPlan,
} from '../api/trainerNutrition';
import { getMyClients, TrainerClient } from '../api/trainers';
import { Action, Card, Copy, Field, IconAction, ListRow, Notice, Segmented, Sheet, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Chip from '../components/Chip';
import StatTile from '../components/StatTile';
import EmptyState from '../components/ui-states/EmptyState';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';

type ClientRow = TrainerClient & { clientName?: string };
type PlanStatus = 'draft' | 'published' | 'archived';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const TARGET_FIELDS: { key: keyof NutritionTargets; label: string }[] = [
  { key: 'caloriesKcal', label: 'Calories (kcal)' },
  { key: 'proteinG', label: 'Protein (g)' },
  { key: 'carbsG', label: 'Carbs (g)' },
  { key: 'fatG', label: 'Fat (g)' },
  { key: 'fiberG', label: 'Fiber (g)' },
  { key: 'waterMl', label: 'Water (ml)' },
];

const FILTERS: { value: PlanStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

function strOrNull(t: string): string | null { const v = t.trim(); return v || null; }
function toNum(t: string): number | null {
  const v = t.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function itemName(item: NutritionPlanItem): string {
  return item.name || item.foodName || (item.ingredientId ? `Ingredient ${item.ingredientId.slice(0, 8)}` : item.recipeId ? `Recipe ${item.recipeId.slice(0, 8)}` : 'Item');
}

export default function TrainerNutritionScreen() {
  const { colors } = useTheme();

  // list state
  const [plans, setPlans] = useState<TrainerNutritionPlan[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [filter, setFilter] = useState<PlanStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // editor state
  const [editing, setEditing] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('draft');
  const [version, setVersion] = useState(1);
  const [title, setTitle] = useState('');
  const [guidanceText, setGuidanceText] = useState('');
  const [targets, setTargets] = useState<Record<keyof NutritionTargets, string>>({
    caloriesKcal: '', proteinG: '', carbsG: '', fatG: '', fiberG: '', waterMl: '',
  });
  const [meals, setMeals] = useState<NutritionPlanMeal[]>([]);
  const [editorLoading, setEditorLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [mealEditor, setMealEditor] = useState<number | null>(null);
  const [itemDraft, setItemDraft] = useState<{ foodName: string; quantityG: string; substitutions: string }>({ foodName: '', quantityG: '', substitutions: '' });

  const [preview, setPreview] = useState<NutritionPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const editable = status === 'draft';

  const loadPlans = useCallback(async (status: PlanStatus | '' = filter) => {
    setError(null);
    try {
      const data = await listNutritionPlans(status || undefined);
      setPlans(data.plans);
      setDisclaimer(data.disclaimer);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Could not load nutrition plans.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { if (!editing) void loadPlans(); }, [loadPlans, editing]));

  const newPlan = () => {
    setPlanId(null);
    setStatus('draft');
    setVersion(1);
    setTitle('');
    setGuidanceText('');
    setTargets({ caloriesKcal: '', proteinG: '', carbsG: '', fatG: '', fiberG: '', waterMl: '' });
    setMeals([]);
    setEditorError(null);
    setNotice(null);
    setEditing(true);
  };

  const openPlan = async (id: string) => {
    setEditing(true);
    setEditorLoading(true);
    setEditorError(null);
    setNotice(null);
    try {
      const plan = await getNutritionPlan(id);
      setPlanId(plan.id);
      setStatus(plan.status);
      setVersion(plan.version);
      setTitle(plan.title);
      setGuidanceText(plan.guidanceText || '');
      const t = plan.targets || {};
      setTargets({
        caloriesKcal: t.caloriesKcal != null ? String(t.caloriesKcal) : '',
        proteinG: t.proteinG != null ? String(t.proteinG) : '',
        carbsG: t.carbsG != null ? String(t.carbsG) : '',
        fatG: t.fatG != null ? String(t.fatG) : '',
        fiberG: t.fiberG != null ? String(t.fiberG) : '',
        waterMl: t.waterMl != null ? String(t.waterMl) : '',
      });
      setMeals(plan.meals || []);
      setDisclaimer(plan.disclaimer || disclaimer);
    } catch (e: any) {
      setEditorError(e.response?.data?.error || e.message || 'Could not load the plan.');
    } finally {
      setEditorLoading(false);
    }
  };

  const payload = () => ({
    title: title.trim(),
    guidanceText: strOrNull(guidanceText),
    meals: meals.map((m) => ({
      mealType: m.mealType,
      timing: strOrNull(m.timing || ''),
      notes: strOrNull(m.notes || ''),
      items: m.items.map((i) => ({
        ingredientId: i.ingredientId ?? null,
        recipeId: i.recipeId ?? null,
        foodName: strOrNull(i.foodName || ''),
        quantityG: i.quantityG,
        substitutions: i.substitutions ?? null,
      })),
    })),
    targets: Object.fromEntries(
      TARGET_FIELDS.map(({ key }) => [key, toNum(targets[key])]).filter(([, v]) => v !== null),
    ) as NutritionTargets,
  });

  const validate = (): string | null => {
    if (!title.trim()) return 'Give the plan a title.';
    for (const m of meals) {
      if (!m.items.length) return `Meal "${m.mealType}" has no items — add one or remove the meal.`;
      for (const i of m.items) {
        if (!strOrNull(i.foodName || '') && !i.ingredientId && !i.recipeId) return 'Every meal item needs a food name, ingredient or recipe.';
      }
    }
    return null;
  };

  const save = async (): Promise<string | null> => {
    const problem = validate();
    if (problem) { setEditorError(problem); return null; }
    setBusy('save');
    setEditorError(null);
    setNotice(null);
    try {
      const saved = planId ? await updateNutritionPlan(planId, payload()) : await createNutritionPlan(payload());
      setPlanId(saved.id);
      setStatus(saved.status);
      setVersion(saved.version);
      setNotice('Draft saved.');
      return saved.id;
    } catch (e: any) {
      setEditorError(e.response?.data?.error || e.message || 'The plan could not be saved.');
      return null;
    } finally {
      setBusy(null);
    }
  };

  const run = async (kind: string, fn: () => Promise<TrainerNutritionPlan>, done: (p: TrainerNutritionPlan) => void) => {
    if (!planId) return;
    setBusy(kind);
    setEditorError(null);
    try {
      const plan = await fn();
      setPlanId(plan.id);
      setStatus(plan.status);
      setVersion(plan.version);
      done(plan);
    } catch (e: any) {
      setEditorError(e.response?.data?.error || e.message || 'The action could not be completed.');
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    const id = planId || (await save());
    if (!id) return;
    setBusy('publish');
    setEditorError(null);
    try {
      await updateNutritionPlan(id, payload());
      const published = await publishNutritionPlan(id);
      setStatus(published.status);
      setVersion(published.version);
      setNotice('Published. You can now assign this plan to a client.');
      void openAssign();
    } catch (e: any) {
      setEditorError(e.response?.data?.error || e.message || 'The plan could not be published.');
    } finally {
      setBusy(null);
    }
  };

  const openPreview = async () => {
    if (!planId) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      setPreview(await previewNutritionPlan(planId));
    } catch (e: any) {
      setPreview(null);
      setEditorError(e.response?.data?.error || e.message || 'Preview could not be loaded.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const openAssign = async () => {
    setAssignOpen(true);
    setAssignError(null);
    try {
      const data = await getMyClients();
      setClients((data.clients || []) as ClientRow[]);
    } catch (e: any) {
      setAssignError(e.response?.data?.error || e.message || 'Could not load clients.');
    }
  };

  const assign = async (client: ClientRow) => {
    if (!planId) return;
    setAssigning(client.clientId);
    try {
      const result = await assignNutritionPlan(planId, client.clientId);
      setAssignOpen(false);
      setNotice(result.allergyConflicts.length
        ? `Assigned to ${client.clientName || 'client'} — review the allergy warnings in preview.`
        : `Assigned to ${client.clientName || 'client'}.`);
    } catch (e: any) {
      setAssignError(e.response?.data?.error || e.message || 'The plan could not be assigned.');
    } finally {
      setAssigning(null);
    }
  };

  const updateMeal = (index: number, patch: Partial<NutritionPlanMeal>) => {
    setMeals(meals.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const addItem = () => {
    if (mealEditor === null) return;
    const quantityG = toNum(itemDraft.quantityG);
    if (!itemDraft.foodName.trim()) { setEditorError('Give the item a food name.'); return; }
    if (quantityG === null || quantityG <= 0) { setEditorError('Quantity must be a positive number of grams.'); return; }
    const item: NutritionPlanItem = {
      foodName: itemDraft.foodName.trim(),
      quantityG,
      substitutions: strOrNull(itemDraft.substitutions),
    };
    updateMeal(mealEditor, { items: [...meals[mealEditor].items, item] });
    setItemDraft({ foodName: '', quantityG: '', substitutions: '' });
    setEditorError(null);
  };

  // --- list mode ---------------------------------------------------------------

  if (!editing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <FlatList
          data={loading ? [] : plans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadPlans(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={{ gap: 12, marginBottom: 4 }}>
              <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Nutrition guidance</Copy>
              <Copy tone="muted">Write meal guidance with macro targets, then assign it to clients.</Copy>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {FILTERS.map((f) => (
                  <Chip key={f.label} label={f.label} selected={filter === f.value}
                    accessibilityLabel={`Filter plans: ${f.label}`}
                    onPress={() => { setFilter(f.value); setLoading(true); void loadPlans(f.value); }} />
                ))}
              </View>
              <Action label="New nutrition plan" onPress={newPlan} />
              {!!disclaimer && <Notice title="Disclaimer" message={disclaimer} />}
              {!!error && !loading && (
                <Card><Notice error title="Could not load plans" message={error} /><Action label="Retry" onPress={() => void loadPlans()} /></Card>
              )}
            </View>
          }
          ListEmptyComponent={
            loading ? <Skeleton label="Loading nutrition plans" /> : error ? null : (
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <EmptyState title={filter ? `No ${filter} plans` : 'No nutrition plans yet'}
                  description="Create a plan with meals and targets, publish it, then assign it to a client." />
              </View>
            )
          }
          renderItem={({ item }) => (
            <Card style={{ padding: 16, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, minWidth: 0 }}><Copy style={{ fontWeight: '700' }} numberOfLines={2}>{item.title}</Copy></View>
                <Chip small label={item.status} accessibilityLabel={`Status: ${item.status}`} />
              </View>
              <Copy size="caption" tone="muted">
                Version {item.version} · {item._count?.meals ?? item.meals?.length ?? 0} meal{(item._count?.meals ?? item.meals?.length ?? 0) === 1 ? '' : 's'}
                {item._count?.assignments ? ` · ${item._count.assignments} assigned` : ''}
              </Copy>
              <Action secondary label="Open plan" onPress={() => void openPlan(item.id)} />
            </Card>
          )}
        />
      </View>
    );
  }

  // --- editor mode -------------------------------------------------------------

  const editingMeal = mealEditor !== null ? meals[mealEditor] : null;

  return (
    <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>{planId ? 'Edit nutrition plan' : 'New nutrition plan'}</Copy>
          <Copy tone="muted">{planId ? `Version ${version} · ${status}` : 'Saved as a draft until you publish.'}</Copy>
        </View>
        <IconAction icon="←" label="Back to plans" onPress={() => { setEditing(false); void loadPlans(); }} />
      </View>

      {!!disclaimer && <Notice title="Disclaimer" message={disclaimer} />}

      {editorLoading ? <Skeleton label="Loading nutrition plan" /> : (
        <>
          {!editable && (
            <Card>
              <Notice title={`This plan is ${status}`}
                message={status === 'published' ? 'Published plans are locked. Revise to create a new draft, or assign it to a client.' : 'Archived plans are read-only.'} />
              {status === 'published' && (
                <Action label={busy === 'revise' ? 'Creating draft…' : 'Revise to a new draft'} disabled={busy !== null}
                  onPress={() => void run('revise', () => reviseNutritionPlan(planId!), (p) => setNotice(`Version ${p.version} draft created.`))} />
              )}
              {status === 'published' && <Action secondary label="Assign to a client" onPress={() => void openAssign()} />}
              <Action secondary label={busy === 'archive' ? 'Archiving…' : 'Archive'} disabled={busy !== null}
                onPress={() => void run('archive', () => archiveNutritionPlan(planId!), () => setNotice('Plan archived.'))} />
            </Card>
          )}

          <Card>
            <Field label="Title" value={title} editable={editable} onChangeText={setTitle} maxLength={200} placeholder="e.g. High-protein cut" />
            <Field label="Guidance" value={guidanceText} editable={editable} onChangeText={setGuidanceText} multiline maxLength={10000}
              placeholder="How to follow this guidance day to day" />
          </Card>

          <Card>
            <Copy size="heading" accessibilityRole="header">Daily targets</Copy>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {TARGET_FIELDS.map(({ key, label }) => (
                <View key={key} style={{ flexBasis: '45%', flexGrow: 1 }}>
                  <Field label={label} value={targets[key]} editable={editable} keyboardType="decimal-pad"
                    onChangeText={(v) => setTargets({ ...targets, [key]: v })} placeholder="—" />
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <Copy size="heading" accessibilityRole="header">Meals</Copy>
            {meals.length === 0 && <Copy tone="muted">No meals yet — add breakfast, lunch, dinner or a snack.</Copy>}
            {meals.map((m, i) => (
              <ListRow key={i} title={m.mealType[0].toUpperCase() + m.mealType.slice(1)}
                subtitle={`${m.items.length} item${m.items.length === 1 ? '' : 's'}${m.timing ? ` · ${m.timing}` : ''}`}
                onPress={editable ? () => setMealEditor(i) : undefined}>
                {editable && <IconAction icon="✕" danger label={`Remove ${m.mealType}`} onPress={() => setMeals(meals.filter((_, x) => x !== i))} />}
              </ListRow>
            ))}
            {editable && <Action secondary label="Add a meal" onPress={() => setMeals([...meals, { mealType: 'breakfast', items: [] }])} />}
          </Card>

          {!!editorError && <Card><Notice error title="Could not continue" message={editorError} /></Card>}
          {!!notice && <Card><Notice title="Done" message={notice} /></Card>}

          {editable && (
            <>
              <Action label={busy === 'save' ? 'Saving…' : 'Save draft'} disabled={busy !== null} onPress={() => void save()} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><Action secondary label="Preview" disabled={busy !== null || !planId} hint={planId ? undefined : 'Save the draft first.'} onPress={() => void openPreview()} /></View>
                <View style={{ flex: 1 }}><Action secondary label={busy === 'publish' ? 'Publishing…' : 'Publish'} disabled={busy !== null} onPress={() => void publish()} /></View>
              </View>
            </>
          )}
          {!editable && planId && <Action secondary label="Preview" onPress={() => void openPreview()} />}
          {status === 'published' && planId && <Action secondary label="Assign to a client" onPress={() => void openAssign()} />}
        </>
      )}

      {/* Meal editor */}
      <Sheet visible={mealEditor !== null} title="Edit meal" onClose={() => setMealEditor(null)}>
        {editingMeal && (
          <>
            <Segmented label="Meal" value={editingMeal.mealType as typeof MEAL_TYPES[number]}
              onChange={(v) => updateMeal(mealEditor!, { mealType: v })}
              options={MEAL_TYPES.map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))} />
            <Field label="Timing" value={editingMeal.timing || ''} onChangeText={(v) => updateMeal(mealEditor!, { timing: v })} maxLength={100} placeholder="e.g. within 1h of waking" />
            <Field label="Notes" value={editingMeal.notes || ''} onChangeText={(v) => updateMeal(mealEditor!, { notes: v })} multiline maxLength={2000} />
            <Copy style={{ fontWeight: '700' }}>Items</Copy>
            {editingMeal.items.length === 0 && <Copy tone="muted">No items yet.</Copy>}
            {editingMeal.items.map((item, i) => (
              <ListRow key={i} title={itemName(item)} subtitle={`${item.quantityG}g${item.substitutions ? ' · has substitutions' : ''}`}>
                <IconAction icon="✕" danger label={`Remove ${itemName(item)}`}
                  onPress={() => updateMeal(mealEditor!, { items: editingMeal.items.filter((_, x) => x !== i) })} />
              </ListRow>
            ))}
            <Card>
              <Field label="Food name" value={itemDraft.foodName} onChangeText={(v) => setItemDraft({ ...itemDraft, foodName: v })} maxLength={300} placeholder="e.g. Greek yogurt" />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}><Field label="Quantity (g)" value={itemDraft.quantityG} onChangeText={(v) => setItemDraft({ ...itemDraft, quantityG: v })} keyboardType="decimal-pad" placeholder="200" /></View>
                <View style={{ flex: 1 }}><Field label="Substitutions" value={itemDraft.substitutions} onChangeText={(v) => setItemDraft({ ...itemDraft, substitutions: v })} placeholder="e.g. skyr" /></View>
              </View>
              <Action secondary label="Add item" onPress={addItem} />
            </Card>
          </>
        )}
      </Sheet>

      {/* Preview */}
      <Sheet visible={previewOpen} title="Plan preview" onClose={() => setPreviewOpen(false)}>
        {previewLoading && <Skeleton label="Computing nutrition" />}
        {preview && (
          <>
            {!!preview.disclaimer && <Notice title="Disclaimer" message={preview.disclaimer} />}
            {preview.allergyCheckConsent === false && (
              <Copy size="caption" tone="muted">Allergy check needs the client&apos;s consent — conflicts can only be computed when consent is granted.</Copy>
            )}
            {preview.allergyConflicts.length > 0 && (
              <Notice error title="Possible allergy conflicts"
                message={preview.allergyConflicts.map((c) => `${c.item} (${c.mealType}) may contain ${c.allergen}`).join('\n')} />
            )}
            <Copy style={{ fontWeight: '700' }}>Computed daily totals{preview.complete ? '' : ' (partial — some items have no nutrition data)'}</Copy>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <StatTile label="Calories" value={preview.totals?.calories != null ? `${Math.round(preview.totals.calories)}` : '—'} />
              <StatTile label="Protein" value={preview.totals?.proteinG != null ? `${Math.round(preview.totals.proteinG)}g` : '—'} />
              <StatTile label="Carbs" value={preview.totals?.carbsG != null ? `${Math.round(preview.totals.carbsG)}g` : '—'} />
              <StatTile label="Fat" value={preview.totals?.fatG != null ? `${Math.round(preview.totals.fatG)}g` : '—'} />
            </View>
            {preview.targets && (
              <>
                <Copy style={{ fontWeight: '700' }}>Targets</Copy>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {TARGET_FIELDS.filter(({ key }) => preview.targets?.[key] != null).map(({ key, label }) => (
                    <StatTile key={key} label={label} value={`${preview.targets?.[key]}`} />
                  ))}
                </View>
              </>
            )}
            <Copy style={{ fontWeight: '700' }}>Meals</Copy>
            {preview.meals.map((m) => (
              <Card key={m.id || m.mealType} style={{ padding: 12, gap: 4 }}>
                <Copy style={{ fontWeight: '600' }}>{m.mealType[0].toUpperCase() + m.mealType.slice(1)}{m.timing ? ` · ${m.timing}` : ''}</Copy>
                {m.items.map((item, i) => (
                  <Copy key={item.id || i} size="caption" tone="muted">
                    {itemName(item)} · {item.quantityG}g{item.resolvable === false ? ' · no nutrition data' : item.nutrition?.calories != null ? ` · ${Math.round(item.nutrition.calories)} kcal` : ''}
                  </Copy>
                ))}
              </Card>
            ))}
          </>
        )}
      </Sheet>

      {/* Assign */}
      <Sheet visible={assignOpen} title="Assign to a client" onClose={() => setAssignOpen(false)}>
        {!!assignError && <Notice error title="Assignment problem" message={assignError} />}
        {clients.length === 0 && !assignError && <Copy tone="muted">Loading clients…</Copy>}
        {clients.filter((c) => c.status === 'active').map((c) => (
          <ListRow key={c.id} title={c.clientName || 'Client'} subtitle={`${c.daysWithTrainer ?? 0} days with you`}>
            <Action label={assigning === c.clientId ? 'Assigning…' : 'Assign'} disabled={assigning !== null} onPress={() => void assign(c)} />
          </ListRow>
        ))}
        {clients.length > 0 && clients.filter((c) => c.status === 'active').length === 0 && (
          <Copy tone="muted">No active clients. A plan can only be assigned while the coaching relationship is active.</Copy>
        )}
      </Sheet>
    </KeyboardAwareScrollView>
  );
}
