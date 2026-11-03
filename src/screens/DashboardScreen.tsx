import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useProfile } from '../context/ProfileContext';
import { estimateBMR, estimateTDEE, calorieTarget } from '../services/energy';
import { getEnergySummary, EnergySummary } from '../api/energy';
import { getEnergyRecords, EnergyRecord } from '../api/healthData';
import { useMeals } from '../context/MealsContext';
import { useDailyStats } from '../hooks/useDailyStats';
import { getMacroGoals, MacroGoals } from '../api/macroScore';
import { getHealthScore, HealthScoreResponse } from '../api/healthScore';
import ScoreRing from '../components/ScoreRing';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { Action, Card, Copy, Field, IconAction, Notice, Progress, Sheet, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { useDisplayPreferences } from '../context/DisplayPreferencesContext';
import StepsCard from '../components/today/StepsCard';
import { SupplementsDetail, WeatherDetail } from '../components/today/OptionalDetails';
import TodayActionsCard from '../components/TodayActionsCard';
import { todaySummary, validTarget } from '../util/todaySummary';
import { todayInsight } from '../util/todayInsight';
import { formatVolume, VolumeUnit, VOLUME_UNITS } from '../util/units';
import { loadVolumeUnit, saveVolumeUnit } from '../storage/volumePrefs';
import { getReminderPreferences } from '../api/reminders';
import { dismissReminderNudge, loadReminderNudge, snoozeReminderNudge } from '../storage/reminderNudge';
import { loadProgressPrefs } from '../storage/progressPrefs';
import { useWeather } from '../hooks/useWeather';
import { weatherSuggestion, weatherSummaryLine, weatherIcon } from '../services/weatherContext';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const { cards } = useDisplayPreferences();
  const diary = useMeals();
  const { isEnabled } = useFeatureFlags();
  const daily = useDailyStats(isEnabled('supplements'));
  const [goals, setGoals] = useState<MacroGoals | null>(null);
  const [goalLoading, setGoalLoading] = useState(true);
  const [goalError, setGoalError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [waterUnit, setWaterUnit] = useState<VolumeUnit>('ml');
  const [waterAmount, setWaterAmount] = useState('');
  const [weatherCityOpen, setWeatherCityOpen] = useState(false);
  const [reminderNudgeOpen, setReminderNudgeOpen] = useState(false);
  const [weatherCity, setWeatherCityText] = useState('');
  const [weatherCityBusy, setWeatherCityBusy] = useState(false);
  const [weatherCityMessage, setWeatherCityMessage] = useState('');
  const [waterBusy, setWaterBusy] = useState(false);
  const [waterMessage, setWaterMessage] = useState('');
  const waterLock = useRef(false);
  const [details, setDetails] = useState(false);
  const weather = useWeather();
  const [energyInfo, setEnergyInfo] = useState(false);
  const [workoutDays, setWorkoutDays] = useState<number[]>([]);
  const [restDays, setRestDays] = useState<number[]>([]);
  const [now, setNow] = useState(new Date());
  const [health, setHealth] = useState<HealthScoreResponse | null>(null);
  const [healthError, setHealthError] = useState(false);
  const goalRequest = useRef(0);
  const healthRequest = useRef(0);
  const summary = todaySummary(diary.meals, now);
  const target = validTarget(goals?.caloriesTarget);
  // Calories are a budget (red = over); macros are goals to reach (green = reached).
  const pctOf = (v: number | null, t: number | null) => (v != null && t != null && t > 0 ? (v / t) * 100 : null);
  const budgetTone = (p: number | null) => p == null ? 'primary' as const : p > 105 ? 'danger' as const : p >= 85 ? 'warning' as const : 'primary' as const;
  const goalTone = (p: number | null) => p == null ? 'primary' as const : p >= 90 ? 'primary' as const : p >= 40 ? 'warning' as const : 'muted' as const;
  const energy = { bmr: estimateBMR(profile), tdee: estimateTDEE(profile), target: calorieTarget(profile) };
  // Backend-owned summary is the shared truth with web; local estimates are
  // the offline fallback only.
  const [energyApi, setEnergyApi] = useState<EnergySummary | null>(null);
  useEffect(() => { getEnergySummary().then(setEnergyApi).catch(() => setEnergyApi(null)); }, []);
  const [wearable, setWearable] = useState<EnergyRecord[] | null>(null);
  useEffect(() => { if (!energyApi) getEnergyRecords(7).then(r => setWearable(r.records)).catch(() => setWearable([])); }, [energyApi]);
  // Latest day's imported active energy, grouped by provider (no double counting).
  const todayActive = (wearable || []).filter(r => r.startAt.slice(0, 10) === new Date().toISOString().slice(0, 10))
    .reduce((m: Record<string, { kcal: number; syncedAt: string }>, r) => { const p = m[r.provider] || { kcal: 0, syncedAt: r.syncedAt }; p.kcal += r.activeKcal; if (r.syncedAt > p.syncedAt) p.syncedAt = r.syncedAt; m[r.provider] = p; return m; }, {});
  const waterTarget = validTarget(goals?.waterMlTarget);
  const waterUnitDef = VOLUME_UNITS.find(u => u.key === waterUnit) ?? VOLUME_UNITS[5];
  const waterAmountNum = Number.parseFloat(waterAmount.replace(',', '.'));
  const waterStepMl = Number.isFinite(waterAmountNum) && waterAmountNum > 0 ? Math.round(waterAmountNum * waterUnitDef.mlPerUnit) : 250;
  const insight = cards.note ? todayInsight({
    mealsLogged: summary.meals.length,
    mealsWithMissingNutrition: summary.fiber === null && summary.meals.length > 0,
    caloriesLogged: summary.calories, proteinLogged: summary.protein,
    waterMl: daily.stats?.waterMl ?? null, waterMlTarget: waterTarget,
    proteinTarget: validTarget(goals?.proteinTarget), now,
  }) : null;
  // Water findings render on the Water card — no duplicate insight card.
  const insightForWater = insight?.action === 'water' ? insight : null;
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
    const hr = ++healthRequest.current;
    getHealthScore().then(s => { if (hr === healthRequest.current) { setHealth(s); setHealthError(false); } }).catch(() => { if (hr === healthRequest.current) { setHealth(null); setHealthError(true); } });
    void loadProgressPrefs().then(p => { setWorkoutDays(p.workoutDays); setRestDays(p.restDays); }).catch(() => { setWorkoutDays([]); setRestDays([]); });
    void loadVolumeUnit().then(setWaterUnit);
    void maybeShowReminderNudge();
    return () => { goalRequest.current += 1; healthRequest.current += 1; };
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
    try { await Promise.allSettled([diary.syncAll(), daily.refresh(), loadGoals(), weather.refresh()]); }
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
  async function maybeShowReminderNudge() {
    try {
      const [prefs, nudge] = await Promise.all([getReminderPreferences(), loadReminderNudge()]);
      if (!prefs.masterEnabled && !nudge.dontShow && Date.now() >= nudge.snoozedUntil) setReminderNudgeOpen(true);
    } catch { /* offline or signed out — the nudge can wait */ }
  }
  async function saveWeatherCity() {
    if (weatherCityBusy) return;
    setWeatherCityBusy(true);
    const result = await weather.setCity(weatherCity);
    setWeatherCityBusy(false);
    setWeatherCityMessage(result === 'saved' ? '' : result === 'not-found' ? 'No matching place found. Try a nearby town or check spelling.' : 'Could not look up that place right now.');
    if (result === 'saved') { setWeatherCityText(''); setWeatherCityOpen(false); }
  }
  const workoutPlanned = workoutDays.includes(now.getDay());
  const suggestion = weather.weather && !weather.stale
    ? weatherSuggestion({ weather: weather.weather, workoutPlanned, restDay: restDays.includes(now.getDay()) })
    : null;
  const waterControls = <>
    <Copy size="heading" style={{ fontWeight: '700' }}>{daily.stats ? formatVolume(daily.stats.waterMl, waterUnit) : '—'}</Copy>
    <Copy tone="muted">{waterTarget ? `Daily target ${formatVolume(waterTarget, waterUnit)}` : 'Daily target unavailable'}</Copy>
    <Progress label="Logged water" value={daily.stats?.waterMl ?? null} target={waterTarget} />
    <Field label={`Amount (${waterUnitDef.symbol})`} value={waterAmount} onChangeText={setWaterAmount} keyboardType="decimal-pad" placeholder={formatVolume(250, waterUnit)} />
    <Action label={waterBusy ? 'Saving water…' : `Add ${formatVolume(waterStepMl, waterUnit)} water`} disabled={waterBusy || daily.loading} onPress={() => { void water(waterStepMl); }} />
    <Action secondary label={`Remove ${formatVolume(waterStepMl, waterUnit)} water`} disabled={waterBusy || !daily.stats?.waterMl} onPress={() => { void water(-waterStepMl); }} />
    <Pressable accessibilityRole="button" accessibilityLabel={`Water unit: ${waterUnitDef.name}. Change unit.`}
      accessibilityState={{ expanded: unitPickerOpen }}
      onPress={() => setUnitPickerOpen(open => !open)}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingVertical: 8,
        borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, opacity: pressed ? 0.6 : 1 })}>
      <Copy size="caption" tone="muted">Unit</Copy>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Copy size="caption" style={{ color: colors.primary, fontWeight: '600' }}>{waterUnitDef.name}</Copy>
        <Ionicons name={unitPickerOpen ? 'chevron-down' : 'chevron-forward'} size={14} color={colors.muted} />
      </View>
    </Pressable>
    {unitPickerOpen && VOLUME_UNITS.map(u => <Pressable key={u.key} accessibilityRole="button" accessibilityLabel={u.name}
      accessibilityState={{ selected: waterUnit === u.key }}
      onPress={() => { setWaterUnit(u.key); void saveVolumeUnit(u.key); setUnitPickerOpen(false); }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingLeft: 12,
        borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, opacity: pressed ? 0.6 : 1 })}>
      <Copy style={{ fontWeight: waterUnit === u.key ? '700' : '400' }}>{u.name}</Copy>
      {waterUnit === u.key && <Ionicons name="checkmark" size={20} color={colors.primary} />}
    </Pressable>)}
    {waterMessage !== '' && <Copy accessibilityLiveRegion="polite" size="caption">{waterMessage}</Copy>}
    {daily.waterSyncError && <><Notice error title="Water sync pending" message={daily.waterSyncError} />
      <Action secondary label="Retry water sync" disabled={waterBusy} onPress={() => { void retryWater(); }} /></>}
  </>;
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <View style={{ gap: 4 }}><Copy tone="muted" size="caption">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Copy>
        <Copy accessibilityRole="header" size="heading" style={{ fontWeight: '700' }}>Hello{profile?.name.trim() ? `, ${profile.name.trim().split(/\s+/)[0]}` : ''}</Copy>
        {weather.weather && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={weatherIcon(weather.weather.weatherCode) as any} size={16} color={colors.muted} />
          <Copy size="caption" tone="muted">{weatherSummaryLine(weather.weather)}{(() => { const p = weather.savedLocation?.label ?? weather.locationLabel; return p ? ` · ${p.length > 13 ? `${p.slice(0, 12).trimEnd()}…` : p}` : ''; })()}{weather.stale ? ' (earlier forecast)' : ''}</Copy>
          <IconBtn name="create-outline" label="Change weather city" onPress={() => setWeatherCityOpen(true)} />
        </View>}</View>
      {diary.syncError && <Card><Notice title="Showing your saved diary" message="Meal sync is pending. Your saved meals are still available." />
        <Action secondary label="Retry meal sync" onPress={() => { void refresh(); }} /></Card>}
      {workoutPlanned && <Card>
        <Copy accessibilityRole="header" size="title" style={{ fontWeight: '600' }}>Today’s plan: workout</Copy>
        <Copy tone="muted" size="caption">{suggestion ?? 'Scheduled in your plan. Rest is a valid choice too.'}</Copy>
        <Action label="Start workout" onPress={() => navigation.navigate('LogExercise')} />
      </Card>}
      {!workoutPlanned && suggestion && <Copy size="caption" tone="muted">{suggestion}</Copy>}
      <Card>
        {diary.loading && summary.meals.length === 0 ? <Skeleton label="Loading your saved meals" /> : <>
          <Copy accessibilityRole="header" size="display" style={{ fontWeight: '700' }}>{summary.calories === null ? '—' : Math.round(summary.calories).toLocaleString()} <Copy tone="muted">kcal logged</Copy></Copy>
          <Copy tone="muted">{target ? `Daily target · ${Math.round(target).toLocaleString()} kcal est.` : 'Daily target unavailable'}</Copy>
          <Progress label="Logged food calories toward daily target" value={summary.calories} target={target} tone={budgetTone(pctOf(summary.calories, target))} />
        </>}
        {goalLoading && <Skeleton label="Loading your targets" />}
        {goalError && <><Notice title="Targets couldn’t load" message="You can still log food and see meals saved on this device." />
          <Action secondary label="Retry targets" onPress={() => { void loadGoals(); }} /></>}
        <Copy size="caption" tone="muted">Logged meals only — may not be everything you ate.</Copy>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Action label="Log a meal" onPress={() => navigation.navigate('LogMeal')} />
          <Action secondary label="What should I eat?" onPress={() => navigation.navigate('Suggest')} />
        </View>
        <View style={styles.grid}>
          {([
            ['Protein', summary.protein, goals?.proteinTarget], ['Carbs', summary.carbs, goals?.carbsTarget],
            ['Fat', summary.fat, goals?.fatTarget], ['Fiber', summary.fiber, goals?.fiberTarget],
          ] as const).map(([label, value, goal]) => <View key={label} style={[styles.macro, { backgroundColor: colors.accent }]}>
            <Copy style={{ fontWeight: '600' }}>{label}</Copy>
            <Copy>{value === null ? 'Incomplete data' : `${Math.round(value)} g logged`}</Copy>
            <Copy tone="muted" size="caption">{validTarget(goal) ? `Target ${Math.round(goal!)} g` : 'Target unavailable'}</Copy>
            <Progress label={`${label} in grams`} value={value} target={validTarget(goal)} tone={goalTone(pctOf(value, validTarget(goal)))} />
          </View>)}
        </View>
      </Card>
      {insight && insight.action !== 'water' && (() => {
      return <Card>
        <Copy accessibilityRole="header" size="title" style={{ fontWeight: '600' }}>{insight.finding}</Copy>
        <Copy tone="muted" size="caption">{insight.evidence}</Copy>
        <Copy size="caption" tone="muted">{insight.reason}</Copy>
        {insight.action !== 'none' && <Action secondary label={insight.actionLabel} onPress={() => {
          if (insight.action === 'water') { void water(250); } else navigation.navigate('LogMeal');
        }} />}
      </Card>; })()}
      <View style={styles.grid}>{cards.water && <View style={styles.column}><Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="water" size={18} color={colors.primary} />
          <Copy accessibilityRole="header" accessibilityLabel={`Water: ${daily.stats ? formatVolume(daily.stats.waterMl, waterUnit) : 'unavailable'}`}
            size="body" style={{ fontWeight: '700', flexShrink: 1 }}>{daily.stats ? formatVolume(daily.stats.waterMl, waterUnit) : '—'}</Copy>
          <Copy size="caption" tone="muted" style={{ flexShrink: 1 }}>{waterTarget ? `/ ${formatVolume(waterTarget, waterUnit)}${goals?.waterMlTargetBasis === 'custom' ? '' : ' est.'}` : 'logged'}</Copy>
          <View style={{ flex: 1 }} />
          <View style={{ width: 88 }}><Action secondary label={waterBusy ? '…' : `+${formatVolume(250, waterUnit)}`} disabled={waterBusy || daily.loading} onPress={() => { void water(250); }} /></View>
          <IconAction icon="✎" label="Log a different water amount" onPress={() => setWaterOpen(true)} />
        </View>
        <Progress label="Logged water in milliliters" value={daily.stats?.waterMl ?? null} target={waterTarget}
          tone={(() => { const p = pctOf(daily.stats?.waterMl ?? null, waterTarget); return p == null ? 'primary' : p < 50 ? 'danger' : p < 85 ? 'warning' : 'primary'; })()} />
        {insightForWater && <Copy size="caption" tone="muted">{insightForWater.finding} — reflects your target and logs, not a hydration measurement.</Copy>}
        {daily.waterSyncError && <Copy tone="danger" size="caption">Sync pending</Copy>}
      </Card></View>}
        {cards.steps && <View style={styles.column}><StepsCard key={day} /></View>}
        <View style={styles.column}><Card>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('HealthScoreDetail')}
            accessibilityLabel={health?.score == null ? 'Health score: not enough records yet. View details.' : `Health score ${Math.round(health.score)} of 100${health.coverage ? `, ${health.coverage.available} of ${health.coverage.total} parts logged` : ''}. View details.`}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}>
            <ScoreRing score={health?.score ?? null} size={64} />
            <View style={{ flex: 1 }}>
              <Copy size="title" style={{ fontWeight: '600' }}>Health score</Copy>
              <Copy size="caption" tone="muted">{healthError ? 'Couldn’t reach the server — score not loaded' : health?.score == null ? 'No records yet — provisional' : `${health.coverage ? `${health.coverage.available} of ${health.coverage.total} parts logged · ` : ''}Provisional`}</Copy>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        </Card></View>
      </View>
      {isEnabled('healthPriorities') && <TodayActionsCard />}
      {isEnabled('supplements') && <SupplementsDetail daily={daily} />}
      {cards.meals && <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
          <Copy accessibilityRole="header" size="title" style={{ fontWeight: '600', flex: 1 }}>Your meals</Copy>
          <IconBtn name="book-outline" label="Open food diary" onPress={() => navigation.navigate('LogMeal')} />
          <IconBtn name="time-outline" label="View previous days" onPress={() => navigation.navigate('History')} />
        </View>
        {summary.meals.length === 0 ? <Notice title="No meals logged yet" message="Missing logs don’t mean you haven’t eaten. Add a meal when it suits you." /> :
          summary.meals.slice(0, 3).map(meal => <View key={meal.id} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingBottom: 8 }}>
            <Copy style={{ fontWeight: '600', flex: 1 }} numberOfLines={1}>{meal.name}</Copy>
            <Copy size="caption" tone="muted">{new Date(meal.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {Number.isFinite(meal.calories) && meal.calories >= 0 ? `${Math.round(meal.calories)} kcal` : 'Calories unavailable'}</Copy>
          </View>)}
      </Card>}
      <Action secondary label={details ? 'Hide daily details' : 'More about your day'} onPress={() => setDetails(value => !value)} />
      {isEnabled('knowledgeAcademyEnabled') && <Action secondary label="Learn — Myth vs Fact" onPress={() => navigation.navigate('Learn')} />}
      {details && <>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Copy accessibilityRole="header" size="title" style={{ fontWeight: '600', flex: 1 }}>Energy today (estimates)</Copy>
            {energy.bmr != null && <IconBtn name={energyInfo ? 'information-circle' : 'information-circle-outline'}
              label={energyInfo ? 'Hide calculation' : 'How calculated?'} onPress={() => setEnergyInfo(v => !v)} />}
          </View>
          {energyApi ? <>
            <Copy>{summary.calories == null ? 'No food logged yet.' : `Logged so far: ${Math.round(summary.calories)} kcal`}{energyApi.target.intakeKcal ? ` · target ${energyApi.target.intakeKcal} kcal` : ''}</Copy>
            <Copy>
              Calories out so far: {energyApi.expenditure.soFarKcal != null ? `${energyApi.expenditure.soFarKcal} kcal` : '—'}
              {energyApi.day.isToday && energyApi.expenditure.projectedDayKcal != null ? ` · ~${energyApi.expenditure.projectedDayKcal} projected today` : ''}
            </Copy>
            <Copy size="caption" tone="muted">
              Resting {energyApi.resting.soFarKcal ?? '—'} kcal ({sourceLabel(energyApi.resting.source)}) · Active {energyApi.active.soFarKcal ?? '—'} kcal ({sourceLabel(energyApi.active.source)})
            </Copy>
            {energyApi.balance.provisionalKcal != null && <Copy size="caption" tone="muted">Provisional balance {energyApi.balance.provisionalKcal > 0 ? '+' : ''}{energyApi.balance.provisionalKcal} kcal — logged intake vs expended so far, not a confirmed deficit.</Copy>}
            {energyApi.sync.stale && <Copy size="caption" tone="danger">Wearable sync is stale — figures may lag.</Copy>}
            {energyInfo && <Copy size="caption" tone="muted">{energyApi.explanation}</Copy>}
          </> : energy.bmr == null
            ? <Copy tone="muted">Complete your profile to estimate resting energy use.</Copy>
            : <>
              <Copy>{summary.calories == null ? 'No food logged yet.' : `Logged so far: ${Math.round(summary.calories)} kcal`}</Copy>
              {energy.target && <Copy tone="muted">Food target: {energy.target.low}–{energy.target.high} kcal</Copy>}
              <Copy tone="muted">Resting (BMR estimate): ~{energy.bmr} kcal/day · Full-day total (TDEE estimate): ~{energy.tdee} kcal/day</Copy>
              {Object.entries(todayActive).map(([provider, v]) => <Copy key={provider} size="caption" tone="muted">{provider === 'healthkit' ? 'Apple Health' : provider === 'health_connect' ? 'Health Connect' : 'Fitbit'} reports ~{Math.round(v.kcal)} kcal active today (synced {new Date(v.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) — context only, already inside the TDEE estimate.</Copy>)}
              {energyInfo && <Copy size="caption" tone="muted">Resting estimate uses the Mifflin–St Jeor equation from your profile. The full-day estimate multiplies it by your activity level, so routine movement — including wearable active energy — is already included and never added twice. Logged food covers only what you recorded so far today, so it cannot be compared to a full-day estimate as a verified deficit or surplus.</Copy>}
            </>}
        </Card>
        {isEnabled('weeklyMealPlans') && <Action secondary label="Open weekly meal plan" onPress={() => navigation.navigate('WeeklyPlan')} />}
        <WeatherDetail weatherState={weather} />
      </>}
    </ScrollView>
    <Sheet visible={waterOpen} title="Log water" onClose={() => setWaterOpen(false)}>{waterControls}</Sheet>
    <Sheet visible={unitPickerOpen} title="Unit" onClose={() => setUnitPickerOpen(false)}>
      {VOLUME_UNITS.map(u => <Pressable key={u.key} accessibilityRole="button" accessibilityLabel={u.name}
        accessibilityState={{ selected: waterUnit === u.key }}
        onPress={() => { setWaterUnit(u.key); void saveVolumeUnit(u.key); setUnitPickerOpen(false); }}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48,
          borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, opacity: pressed ? 0.6 : 1 })}>
        <Copy style={{ fontWeight: waterUnit === u.key ? '700' : '400' }}>{u.name}</Copy>
        {waterUnit === u.key && <Ionicons name="checkmark" size={20} color={colors.primary} />}
      </Pressable>)}
    </Sheet>
    <Sheet visible={weatherCityOpen} title="Weather city" onClose={() => setWeatherCityOpen(false)}>
      <Copy size="caption" tone="muted">{weather.savedLocation ? `Showing weather for ${weather.savedLocation.label}.` : 'Showing weather for your device location.'}</Copy>
      <Field label="Set a city" value={weatherCity} onChangeText={setWeatherCityText} placeholder="e.g. Pune" />
      {!!weatherCity.trim() && <Action label={weatherCityBusy ? 'Looking up…' : 'Use this city'} disabled={weatherCityBusy} onPress={() => { void saveWeatherCity(); }} />}
      {weather.savedLocation && <Action secondary label="Use device location instead" onPress={() => { void weather.setCity(null); }} />}
      {!!weatherCityMessage && <Copy size="caption" tone="danger">{weatherCityMessage}</Copy>}
    </Sheet>
    <Sheet visible={reminderNudgeOpen} title="Reminders are off" onClose={() => setReminderNudgeOpen(false)}>
      <Copy tone="muted">Turn on reminders to get meal, water, supplement and workout nudges at the times you pick. Nothing sends automatically — you choose every category and time.</Copy>
      <Action label="Set up reminders" onPress={() => { setReminderNudgeOpen(false); navigation.navigate('SmartReminders'); }} />
      <Action secondary label="Maybe later" onPress={() => { void snoozeReminderNudge(); setReminderNudgeOpen(false); }} />
      <Action secondary label="Don't show again" onPress={() => { void dismissReminderNudge(); setReminderNudgeOpen(false); }} />
    </Sheet>
  </View>;
}
function sourceLabel(source: string | null): string {
  if (!source) return 'unavailable';
  if (source.startsWith('wearable:')) {
    const p = source.slice(9);
    return p === 'healthkit' ? 'Apple Health' : p === 'health_connect' ? 'Health Connect' : p === 'fitbit' ? 'Fitbit' : p;
  }
  return 'estimated';
}
function IconBtn({ name, label, onPress }: { name: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => ({ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', opacity: pressed ? 0.6 : 1 })}>
    <Ionicons name={name} size={20} color={colors.primary} />
  </Pressable>;
}
const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 32, gap: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  macro: { flexGrow: 1, flexBasis: '45%', padding: 12, borderRadius: 12, gap: 8 },
  column: { flexGrow: 1, flexBasis: 250 },
});
