import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useProfile } from '../context/ProfileContext';
import { estimateBMR, estimateTDEE, calorieTarget, energyBalance } from '../services/energy';
import { getEnergyRecords, EnergyRecord } from '../api/healthData';
import { useMeals } from '../context/MealsContext';
import { useDailyStats } from '../hooks/useDailyStats';
import { getMacroGoals, MacroGoals } from '../api/macroScore';
import { betaFeatures } from '../config/betaFeatures';
import { Action, Card, Copy, Notice, Progress, Sheet, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { useDisplayPreferences } from '../context/DisplayPreferencesContext';
import AppearancePicker from '../design/AppearancePicker';
import StepsCard from '../components/today/StepsCard';
import { SupplementsDetail, WeatherDetail } from '../components/today/OptionalDetails';
import { todaySummary, validTarget } from '../util/todaySummary';
import { formatWeight } from '../util/units';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const { cards } = useDisplayPreferences();
  const diary = useMeals();
  const daily = useDailyStats(betaFeatures.supplements);
  const [goals, setGoals] = useState<MacroGoals | null>(null);
  const [goalLoading, setGoalLoading] = useState(true);
  const [goalError, setGoalError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);
  const [waterBusy, setWaterBusy] = useState(false);
  const [waterMessage, setWaterMessage] = useState('');
  const waterLock = useRef(false);
  const [details, setDetails] = useState(false);
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [appearance, setAppearance] = useState(false);
  const [now, setNow] = useState(new Date());
  const goalRequest = useRef(0);
  const summary = todaySummary(diary.meals, now);
  const target = validTarget(goals?.caloriesTarget);
  const energy = { bmr: estimateBMR(profile), tdee: estimateTDEE(profile), target: calorieTarget(profile), balance: energyBalance(summary.calories, estimateTDEE(profile)) };
  const [wearable, setWearable] = useState<EnergyRecord[] | null>(null);
  useEffect(() => { getEnergyRecords(7).then(r => setWearable(r.records)).catch(() => setWearable([])); }, []);
  // Latest day's imported active energy, grouped by provider (no double counting).
  const todayActive = (wearable || []).filter(r => r.startAt.slice(0, 10) === new Date().toISOString().slice(0, 10))
    .reduce((m: Record<string, { kcal: number; syncedAt: string }>, r) => { const p = m[r.provider] || { kcal: 0, syncedAt: r.syncedAt }; p.kcal += r.activeKcal; if (r.syncedAt > p.syncedAt) p.syncedAt = r.syncedAt; m[r.provider] = p; return m; }, {});
  const waterTarget = validTarget(goals?.waterMlTarget);
  const loadGoals = useCallback(async () => {
    const request = ++goalRequest.current;
    setGoalLoading(true);
    try { const result = await getMacroGoals(); if (request === goalRequest.current) { setGoals(result); setGoalError(false); } }
    catch { if (request === goalRequest.current) { setGoals(null); setGoalError(true); } }
    finally { if (request === goalRequest.current) setGoalLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    setNow(new Date());
    void loadGoals();
    return () => { goalRequest.current += 1; };
  }, [loadGoals]));
  // Refresh the displayed date after backgrounding or midnight; old meals never count toward a new day.
  useEffect(() => {
    const update = () => setNow(new Date());
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    const timer = setInterval(update, 60000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, []);
  const refreshMeals = diary.refresh;
  const refreshDaily = daily.refresh;
  const day = now.toDateString();
  const previousDay = useRef(day);
  useEffect(() => {
    if (previousDay.current === day) return;
    previousDay.current = day;
    void refreshMeals().catch(() => {});
    void refreshDaily().catch(() => {});
  }, [day, refreshMeals, refreshDaily]);
  useEffect(() => { if (route.params?.waterRequest) setWaterOpen(true); }, [route.params?.waterRequest]);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try { await Promise.allSettled([diary.syncAll(), daily.refresh(), loadGoals()]); }
    finally { setRefreshing(false); }
  }
  async function water(delta: number) {
    if (waterLock.current) return;
    waterLock.current = true;
    setWaterBusy(true);
    setWaterMessage('');
    try { await daily.addWater(delta); setWaterMessage('Water updated on this device.'); }
    catch { setWaterMessage('Could not save water. Please try again.'); }
    finally { waterLock.current = false; setWaterBusy(false); }
  }
  async function retryWater() {
    if (waterLock.current) return;
    waterLock.current = true;
    setWaterBusy(true);
    setWaterMessage('');
    try { await daily.retryWaterSync(); }
    finally { waterLock.current = false; setWaterBusy(false); }
  }
  const waterControls = <>
    <Copy size="heading" style={{ fontWeight: '700' }}>{daily.stats ? `${daily.stats.waterMl.toLocaleString()} ml` : '—'}</Copy>
    <Copy tone="muted">{waterTarget ? `Daily target ${waterTarget.toLocaleString()} ml` : 'Daily target unavailable'}</Copy>
    <Progress label="Logged water in milliliters" value={daily.stats?.waterMl ?? null} target={waterTarget} />
    <Action label={waterBusy ? 'Saving water…' : 'Add 250 ml water'} disabled={waterBusy || daily.loading} onPress={() => { void water(250); }} />
    <Action secondary label="Remove 250 ml water" disabled={waterBusy || !daily.stats?.waterMl} onPress={() => { void water(-250); }} />
    {waterMessage !== '' && <Copy accessibilityLiveRegion="polite" size="caption">{waterMessage}</Copy>}
    {daily.waterSyncError && <><Notice error title="Water sync pending" message={daily.waterSyncError} />
      <Action secondary label="Retry water sync" disabled={waterBusy} onPress={() => { void retryWater(); }} /></>}
  </>;
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <View style={{ gap: 4 }}><Copy tone="muted" size="caption">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Copy>
        <Copy accessibilityRole="header" size="heading" style={{ fontWeight: '700' }}>Hello{profile?.name.trim() ? `, ${profile.name.trim().split(/\s+/)[0]}` : ''}</Copy>
        <Copy tone="muted">A little time for you, today.</Copy></View>
      {diary.syncError && <Card><Notice title="Showing your saved diary" message="Meal sync is pending. Your saved meals are still available." />
        <Action secondary label="Retry meal sync" onPress={() => { void refresh(); }} /></Card>}
      <Card>
        <Copy accessibilityRole="header" size="title" style={{ fontWeight: '600' }}>Today’s food</Copy>
        {diary.loading && summary.meals.length === 0 ? <Skeleton label="Loading your saved meals" /> : <>
          <Copy size="display" style={{ fontWeight: '700' }}>{summary.calories === null ? '—' : Math.round(summary.calories).toLocaleString()} <Copy tone="muted">kcal logged</Copy></Copy>
          <Copy tone="muted">{target ? `Daily target · ${Math.round(target).toLocaleString()} kcal` : 'Daily target unavailable'}</Copy>
          <Progress label="Logged food calories toward daily target" value={summary.calories} target={target} />
        </>}
        {goalLoading && <Skeleton label="Loading your targets" />}
        {goalError && <><Notice title="Targets couldn’t load" message="You can still log food and see meals saved on this device." />
          <Action secondary label="Retry targets" onPress={() => { void loadGoals(); }} /></>}
        <Copy size="caption" tone="muted">Logged food is not necessarily everything you ate. Targets are estimates; activity is not added again here.</Copy>
        <Action label="Log a meal" onPress={() => navigation.navigate('LogMeal')} />
        <View style={styles.grid}>
          {([
            ['Protein', summary.protein, goals?.proteinTarget], ['Carbs', summary.carbs, goals?.carbsTarget],
            ['Fat', summary.fat, goals?.fatTarget], ['Fiber', summary.fiber, goals?.fiberTarget],
          ] as const).map(([label, value, goal]) => <View key={label} style={[styles.macro, { backgroundColor: colors.accent }]}>
            <Copy style={{ fontWeight: '600' }}>{label}</Copy>
            <Copy>{value === null ? 'Incomplete data' : `${Math.round(value)} g logged`}</Copy>
            <Copy tone="muted" size="caption">{validTarget(goal) ? `Target ${Math.round(goal!)} g` : 'Target unavailable'}</Copy>
            <Progress label={`${label} in grams`} value={value} target={validTarget(goal)} />
          </View>)}
        </View>
        <Copy tone="muted" size="caption">Meal values only. Missing nutrients stay unknown; supplement entries are shown separately.</Copy>
      </Card>
      <Card>
        <Copy accessibilityRole="header" size="title" style={{ fontWeight: '600' }}>Energy (estimated)</Copy>
        {energy.bmr == null
          ? <Copy tone="muted">Complete your profile to estimate resting energy use.</Copy>
          : <>
            <Copy>~{energy.bmr} kcal/day resting (BMR estimate) · ~{energy.tdee} kcal/day total (TDEE)</Copy>
            {energy.target && <Copy tone="muted">Food target: {energy.target.low}–{energy.target.high} kcal</Copy>}
            <Copy>{summary.calories == null ? 'No food logged yet — balance unknown, not zero.' : `Logged ${Math.round(summary.calories)} kcal · est. balance ${energy.balance! > 0 ? '+' : ''}${energy.balance} kcal`}</Copy>
            {Object.entries(todayActive).map(([provider, v]) => <Copy key={provider} size="caption" tone="muted">{provider === 'healthkit' ? 'Apple Health' : provider === 'health_connect' ? 'Health Connect' : 'Fitbit'} reports ~{Math.round(v.kcal)} kcal active today (synced {new Date(v.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) — informational only, already inside the TDEE estimate.</Copy>)}
            <Copy size="caption" tone="muted">Estimates, not measurements. Routine activity is already inside TDEE — workouts aren't added again.</Copy>
          </>}
      </Card>
      {cards.note && <Card><Copy accessibilityRole="header" size="title" style={{ fontWeight: '600' }}>A note for today</Copy>
        <Copy>{summary.meals.length === 0 ? 'Your diary is ready whenever you are. Start with a meal you remember.' : summary.fiber === null
          ? 'Some meals have no fiber value. You can review their nutrition in your food diary.'
          : `${summary.meals.length} meal${summary.meals.length === 1 ? '' : 's'} logged today. A useful record starts with what you know.`}</Copy>
        <Copy size="caption" tone="muted">Based on your logged meals, not an AI or medical assessment.</Copy>
        <Action secondary label="Open Leo guide" onPress={() => navigation.navigate('LeoHelp')} />
      </Card>}
      <View style={styles.grid}>{cards.water && <View style={styles.column}><Card><Copy accessibilityRole="header" size="title" style={{ fontWeight: '600' }}>Water</Copy>
        <Copy size="heading" style={{ fontWeight: '700' }}>{daily.stats ? `${daily.stats.waterMl.toLocaleString()} ml` : '—'}</Copy>
        <Copy tone="muted" size="caption">Logged on this device</Copy>
        {daily.waterSyncError && <Copy tone="danger" size="caption">Sync pending</Copy>}
        <Action secondary label="Log water" onPress={() => setWaterOpen(true)} /></Card></View>}
        {cards.steps && <View style={styles.column}><StepsCard key={day} /></View>}</View>
      {cards.meals && <Card><Copy accessibilityRole="header" size="title" style={{ fontWeight: '600' }}>Your meals</Copy>
        {summary.meals.length === 0 ? <Notice title="No meals logged yet" message="Missing logs don’t mean you haven’t eaten. Add a meal when it suits you." /> :
          summary.meals.slice(0, 3).map(meal => <View key={meal.id} style={{ gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingBottom: 12 }}>
            <Copy style={{ fontWeight: '600' }}>{meal.name}</Copy>
            <Copy size="caption" tone="muted">{new Date(meal.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {Number.isFinite(meal.calories) && meal.calories >= 0 ? `${Math.round(meal.calories)} kcal` : 'Calories unavailable'}</Copy>
          </View>)}
        <Action secondary label="Open food diary" onPress={() => navigation.navigate('LogMeal')} />
        <Action secondary label="View previous days" onPress={() => navigation.navigate('History')} />
      </Card>}
      <Action secondary label={details ? 'Hide daily details' : 'More about your day'} onPress={() => setDetails(value => !value)} />
      {details && <>
        <Card><Notice title="Health score is provisional" message="The score reflects recorded data, not your health or the quality of your day. Missing logs can change it. Finalized days and data-completeness measures aren’t available yet." />
          <Copy tone="muted" size="caption">Existing score details use a heuristic and may flag incomplete logs. They are not medical advice.</Copy>
          <Action secondary label="View score details" onPress={() => navigation.navigate('HealthScoreDetail')} /></Card>
        <Card><Copy size="title">Your weight goal</Copy><Copy>Last profile weight · {profile ? formatWeight(profile.weightKg, profile.units) : 'Not set'}</Copy>
          <Copy>Goal · {profile?.goalWeightKg != null ? formatWeight(profile.goalWeightKg, profile.units) : 'Not set'}</Copy>
          <Action secondary label="Update weight and profile" onPress={() => navigation.navigate('EditProfile')} /></Card>
        {betaFeatures.weeklyPlans && <Action secondary label="Open weekly meal plan" onPress={() => navigation.navigate('WeeklyPlan')} />}
        {betaFeatures.supplements && <SupplementsDetail daily={daily} />}
        {weatherEnabled ? <WeatherDetail /> : <Card><Copy size="title">Outdoor plans?</Copy><Copy tone="muted">Weather uses your location to request a local forecast. Connect only if you want it.</Copy>
          <Action secondary label="Connect local weather" onPress={() => setWeatherEnabled(true)} /></Card>}
      </>}
      <Action secondary label="Appearance" onPress={() => setAppearance(true)} />
    </ScrollView>
    <Sheet visible={waterOpen} title="Log water" onClose={() => setWaterOpen(false)}>{waterControls}</Sheet>
    <Sheet visible={appearance} title="Make it yours" onClose={() => setAppearance(false)}><AppearancePicker /></Sheet>
  </View>;
}
const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 32, gap: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  macro: { flexGrow: 1, flexBasis: '45%', padding: 12, borderRadius: 12, gap: 8 },
  column: { flexGrow: 1, flexBasis: 250 },
});
