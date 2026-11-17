import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Action, Card, Copy, Notice, Sheet, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { getProgressCalendar, getDayProgress, ProgressCalendar, CalendarDay, DailyProgress } from '../api/dailyProgress';
import { accountKey } from '../storage/session';
import { accountStorage } from '../storage/accountStorage';
import ScoreRing from '../components/ScoreRing';

const WEEKDAYS_SUN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const COMPONENT_LABEL: Record<string, string> = {
  nutrition: 'Nutrition', hydration: 'Hydration', activity: 'Activity',
  sleep: 'Sleep', habits: 'Habits', planActions: 'Plan actions',
};
const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'not started', IN_PROGRESS: 'in progress', GOAL_MET: 'goal met',
  INSUFFICIENT_DATA: 'not enough data', NOT_APPLICABLE: 'not counted today',
};
const WEEKDAYS_MON = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAME = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// §4 color policy comes from the backend — the client only maps names to theme.
function cellStyle(color: CalendarDay['color'], colors: any) {
  switch (color) {
    case 'GREEN': return { bg: colors.accent, fg: colors.primary };
    case 'YELLOW': return { bg: '#F5E9C8', fg: '#7A5A00' };
    case 'RED': return { bg: '#F4D4D4', fg: '#8C2B2B' };
    case 'TODAY': return { bg: colors.surface, fg: colors.primary };
    default: return { bg: 'transparent', fg: colors.muted };
  }
}

// §3 month grid: full calendar incl. adjacent-month padding cells.
function buildGrid(month: string, days: CalendarDay[], weekStartsMonday: boolean) {
  const [y, m] = month.split('-').map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const lead = (firstWeekday - (weekStartsMonday ? 1 : 0) + 7) % 7;
  const prevDays = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  const cells: ({ key: string; label: number; day?: CalendarDay; padding: boolean })[] = [];
  for (let i = lead - 1; i >= 0; i--) cells.push({ key: `p${i}`, label: prevDays - i, padding: true });
  for (const d of days) cells.push({ key: d.dayKey, label: Number(d.dayKey.slice(8)), day: d, padding: false });
  while (cells.length % 7) cells.push({ key: `n${cells.length}`, label: cells.length - (lead + days.length) + 1, padding: true });
  return cells;
}

export default function LeoCalendarScreen() {
  const { colors } = useTheme();
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [cal, setCal] = useState<ProgressCalendar | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<DailyProgress | null>(null);
  const weekStartsMonday = false; // TODO(§3): locale/user pref — Sunday-first default

  const load = useCallback(async (m: string) => {
    setLoading(true); setError('');
    try { setCal(await getProgressCalendar(m)); } catch { setCal(null); setError('Calendar could not load. Try again when connected.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(month); }, [month, load]);

  function shiftMonth(delta: number) {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }

  const cells = useMemo(() => cal ? buildGrid(cal.month, cal.days, weekStartsMonday) : [], [cal]);
  const [y, m] = month.split('-').map(Number);

  async function openDay(dk: string) {
    setSelected(dk); setDetail(null);
    try { setDetail(await getDayProgress(dk)); } catch { setDetail(null); }
  }

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
    {!!error && <Notice error title="Please review" message={error} />}
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Action secondary label="‹" onPress={() => shiftMonth(-1)} />
        <Pressable accessibilityRole="button" onPress={() => setMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)}>
          <Copy size="heading">{MONTH_NAME[m - 1]} {y}</Copy>
        </Pressable>
        <Action secondary label="›" onPress={() => shiftMonth(1)} />
      </View>
      <View style={{ flexDirection: 'row' }}>
        {(weekStartsMonday ? WEEKDAYS_MON : WEEKDAYS_SUN).map((w, i) => <View key={i} style={{ flex: 1, alignItems: 'center' }}><Copy size="caption" tone="muted">{w}</Copy></View>)}
      </View>
      {loading ? <Skeleton label="Loading calendar" /> : <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map(c => {
          const st = c.day ? cellStyle(c.day.color, colors) : { bg: 'transparent', fg: colors.muted };
          const a11y = c.day ? `${c.day.dayKey}${c.day.isToday ? ', today' : ''}${c.day.earned != null ? `, score ${c.day.earned}` : c.day.future ? ', upcoming' : ', no data'}` : 'padding day';
          return <Pressable key={c.key} accessibilityRole={c.day ? 'button' : undefined} accessibilityLabel={a11y} disabled={!c.day}
            onPress={() => c.day && openDay(c.day.dayKey)}
            style={({ pressed }) => ({ width: `${100 / 7}%`, aspectRatio: 0.8, padding: 2, opacity: pressed ? 0.6 : 1 })}>
            <View style={{
              flex: 1, borderRadius: 8, backgroundColor: st.bg, alignItems: 'center', justifyContent: 'center', gap: 1,
              borderWidth: c.day?.isToday ? 2 : selected === c.day?.dayKey ? 2 : 0,
              borderColor: c.day?.isToday ? colors.primary : colors.text,
              opacity: c.padding ? 0.35 : 1,
            }}>
              <Copy size="caption" style={{ color: st.fg, fontWeight: c.day?.isToday ? '700' : '400' }}>{c.label}</Copy>
              {c.day?.earned != null && <Copy size="caption" style={{ color: st.fg, fontWeight: '700' }}>{c.day.earned}</Copy>}
              {c.day?.restDay && <Copy size="caption" style={{ color: st.fg, fontSize: 8 }}>rest</Copy>}
            </View>
          </Pressable>;
        })}
      </View>}
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {[['GREEN', 'Met target'], ['YELLOW', 'Close'], ['RED', 'Below target'], ['GRAY', 'No data']].map(([k, label]) =>
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cellStyle(k as any, colors).bg, borderWidth: k === 'GRAY' ? 1 : 0, borderColor: colors.border }} />
            <Copy size="caption" tone="muted">{label}</Copy>
          </View>)}
      </View>
    </Card>

    {cal && <Card>
      <Copy size="heading">{MONTH_NAME[m - 1]} progress</Copy>
      <Copy>Monthly average: {cal.summary.average ?? '—'}/day</Copy>
      <Copy>Points so far: {cal.summary.earned.toLocaleString()} / target-to-date {cal.summary.targetToDate.toLocaleString()}</Copy>
      <Copy size="caption" tone="muted">Full-month target (incl. projected): {cal.summary.monthlyTarget.toLocaleString()} · Days met target: {cal.summary.daysMetTarget} · Insufficient data: {cal.summary.gray}</Copy>
      {!!cal.summary.lastMonth && cal.summary.lastMonth.average != null && <Copy size="caption" tone="muted">Last month avg: {cal.summary.lastMonth.average}/day{cal.summary.lastMonth.deltaAvg != null ? ` (${cal.summary.lastMonth.deltaAvg > 0 ? '+' : ''}${cal.summary.lastMonth.deltaAvg} vs this month)` : ''} · {cal.summary.lastMonth.recorded} recorded days</Copy>}
      <Copy size="caption" tone="muted">Colors reflect each day's own assigned target — progress toward your plan, not a health grade.</Copy>
    </Card>}

    <Sheet visible={!!selected} title={selected || ''} onClose={() => setSelected(null)}>
      {detail ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ScoreRing score={detail.earned} size={56} />
          <View>
            <Copy size="heading">{Math.round(detail.earned)} / {detail.applicable}</Copy>
            <Copy size="caption" tone="muted">{cal?.days.find(d => d.isToday)?.dayKey === selected ? 'Today — still in progress' : detail.earned > 0 ? 'Points earned this day' : 'No activity recorded'}</Copy>
          </View>
        </View>
        {detail.components.map(c => <View key={c.key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Copy size="caption">{COMPONENT_LABEL[c.key] || c.key}</Copy>
          <Copy size="caption" tone="muted">{Math.round(c.earned)}/{Math.round(c.applicable)} · {STATUS_LABEL[c.status] || c.status.replace(/_/g, ' ').toLowerCase()}{c.note ? ` — ${c.note}` : ''}</Copy>
        </View>)}
        {detail.nextAction && <Copy size="caption" tone="muted">Next up: {detail.nextAction.note || detail.nextAction.component}</Copy>}
      </> : <Skeleton label="Loading day" />}
    </Sheet>
  </ScrollView>;
}
