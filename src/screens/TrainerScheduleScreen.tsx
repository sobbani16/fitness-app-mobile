import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Booking,
  cancelTrainerBooking,
  completeTrainerBooking,
  createSessionType,
  deleteSessionType,
  getAvailability,
  getAvailableSlots,
  listSessionTypes,
  listTrainerBookings,
  putAvailability,
  rescheduleTrainerBooking,
  respondToBooking,
  SessionMode,
  SessionType,
  updateSessionType,
} from '../api/bookings';
import { getMyClients, TrainerClient } from '../api/trainers';
import { Action, Card, Copy, Field, ListRow, Notice, Segmented, Sheet, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Chip from '../components/Chip';
import Toggle from '../components/Toggle';
import EmptyState from '../components/ui-states/EmptyState';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';

type ClientRow = TrainerClient & { clientName?: string };

const WEEKDAYS: { weekday: number; label: string }[] = [
  { weekday: 1, label: 'Monday' },
  { weekday: 2, label: 'Tuesday' },
  { weekday: 3, label: 'Wednesday' },
  { weekday: 4, label: 'Thursday' },
  { weekday: 5, label: 'Friday' },
  { weekday: 6, label: 'Saturday' },
  { weekday: 0, label: 'Sunday' },
];

const STATUS_FILTERS = ['all', 'requested', 'confirmed', 'completed'] as const;

function minToHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

function hhmmToMin(text: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(text.trim());
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

function toInt(text: string): number | null {
  const t = text.trim();
  return /^\d+$/.test(t) ? parseInt(t, 10) : null;
}

function fmtInstant(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface DayDraft { enabled: boolean; start: string; end: string }

interface SessionTypeDraft {
  id: string | null;
  name: string;
  durationMin: string;
  mode: SessionMode;
  meetingLink: string;
  bufferMin: string;
  minNoticeMin: string;
  cancelWindowMin: string;
  active: boolean;
}

const EMPTY_ST: SessionTypeDraft = {
  id: null, name: '', durationMin: '', mode: 'virtual', meetingLink: '', bufferMin: '', minNoticeMin: '', cancelWindowMin: '', active: true,
};

export default function TrainerScheduleScreen() {
  const { colors } = useTheme();

  const [timeZone, setTimeZone] = useState('UTC');
  const [week, setWeek] = useState<DayDraft[]>(WEEKDAYS.map(() => ({ enabled: false, start: '09:00', end: '17:00' })));
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAvail, setSavingAvail] = useState(false);

  const [stDraft, setStDraft] = useState<SessionTypeDraft | null>(null);
  const [stBusy, setStBusy] = useState(false);

  const [rescheduleFor, setRescheduleFor] = useState<Booking | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [busyBooking, setBusyBooking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [avail, types, list, clientsData] = await Promise.allSettled([
        getAvailability(), listSessionTypes(), listTrainerBookings(), getMyClients(),
      ]);
      if (avail.status === 'fulfilled') {
        setTimeZone(avail.value.timeZone);
        const byDay = new Map(avail.value.windows.map((w) => [w.weekday, w]));
        setWeek(WEEKDAYS.map(({ weekday }) => {
          const w = byDay.get(weekday);
          return w ? { enabled: true, start: minToHHMM(w.startMin), end: minToHHMM(w.endMin) } : { enabled: false, start: '09:00', end: '17:00' };
        }));
      }
      if (types.status === 'fulfilled') setSessionTypes(types.value);
      if (list.status === 'fulfilled') setBookings(list.value);
      if (clientsData.status === 'fulfilled') {
        setClientNames(Object.fromEntries(((clientsData.value.clients || []) as ClientRow[]).filter((c) => c.clientName).map((c) => [c.clientId, c.clientName!])));
      }
      if (avail.status === 'rejected' && types.status === 'rejected' && list.status === 'rejected') {
        setError((avail.reason as any)?.response?.data?.error || 'Could not load your schedule.');
      } else if (avail.status === 'rejected' || types.status === 'rejected' || list.status === 'rejected') {
        setNotice('Some schedule details could not be loaded.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const saveAvailability = async () => {
    const windows: { weekday: number; startMin: number; endMin: number }[] = [];
    for (let i = 0; i < WEEKDAYS.length; i += 1) {
      const d = week[i];
      if (!d.enabled) continue;
      const startMin = hhmmToMin(d.start);
      const endMin = hhmmToMin(d.end);
      if (startMin === null || endMin === null) { setError(`${WEEKDAYS[i].label}: times must be HH:mm.`); return; }
      if (endMin <= startMin) { setError(`${WEEKDAYS[i].label}: end time must be after start time.`); return; }
      windows.push({ weekday: WEEKDAYS[i].weekday, startMin, endMin });
    }
    setSavingAvail(true);
    setError(null);
    setNotice(null);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
      await putAvailability(windows, tz);
      setNotice(windows.length ? 'Availability saved.' : 'Availability cleared — clients cannot book new sessions.');
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Availability could not be saved.');
    } finally {
      setSavingAvail(false);
    }
  };

  const openStEditor = (t?: SessionType) => {
    if (!t) { setStDraft({ ...EMPTY_ST }); return; }
    setStDraft({
      id: t.id,
      name: t.name,
      durationMin: String(t.durationMin),
      mode: t.mode === 'in_person' ? 'in_person' : 'virtual',
      meetingLink: t.meetingLink || '',
      bufferMin: String(t.bufferMin ?? 0),
      minNoticeMin: String(t.minNoticeMin ?? 1440),
      cancelWindowMin: String(t.cancelWindowMin ?? 1440),
      active: t.active,
    });
  };

  const saveSessionType = async () => {
    if (!stDraft) return;
    const durationMin = toInt(stDraft.durationMin);
    if (!stDraft.name.trim()) { setError('Give the session type a name.'); return; }
    if (durationMin === null || durationMin < 5) { setError('Duration must be at least 5 minutes.'); return; }
    setStBusy(true);
    setError(null);
    try {
      const payload = {
        name: stDraft.name.trim(),
        durationMin,
        mode: stDraft.mode,
        meetingLink: stDraft.meetingLink.trim() || null,
        bufferMin: toInt(stDraft.bufferMin) ?? 0,
        minNoticeMin: toInt(stDraft.minNoticeMin) ?? 1440,
        cancelWindowMin: toInt(stDraft.cancelWindowMin) ?? 1440,
      };
      if (stDraft.id) await updateSessionType(stDraft.id, { ...payload, active: stDraft.active });
      else await createSessionType(payload);
      setStDraft(null);
      setNotice('Session type saved.');
      void load();
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'The session type could not be saved.');
    } finally {
      setStBusy(false);
    }
  };

  const removeSessionType = async (t: SessionType) => {
    setStBusy(true);
    setError(null);
    try {
      const result = await deleteSessionType(t.id);
      setStDraft(null);
      setNotice(result.deactivated && !result.deleted ? 'Session type deactivated — existing bookings keep it on record.' : 'Session type removed.');
      void load();
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'The session type could not be removed.');
    } finally {
      setStBusy(false);
    }
  };

  const bookingAction = async (b: Booking, action: 'confirm' | 'decline' | 'cancel' | 'complete') => {
    setBusyBooking(b.id);
    setError(null);
    setNotice(null);
    try {
      if (action === 'confirm' || action === 'decline') await respondToBooking(b.id, action);
      else if (action === 'cancel') await cancelTrainerBooking(b.id);
      else await completeTrainerBooking(b.id);
      setNotice(`Booking ${action === 'confirm' ? 'confirmed' : action === 'decline' ? 'declined' : action === 'cancel' ? 'canceled' : 'marked completed'}.`);
      void load();
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'The booking could not be updated.');
    } finally {
      setBusyBooking(null);
    }
  };

  const openReschedule = async (b: Booking) => {
    setRescheduleFor(b);
    setSlots(null);
    setSlotError(null);
    const trainerId = b.sessionType?.trainerId || sessionTypes.find((t) => t.id === b.sessionTypeId)?.trainerId;
    if (!trainerId) { setSlotError('Could not resolve your trainer id for slot lookup.'); return; }
    try {
      const now = Date.now();
      const list = await getAvailableSlots({
        trainerId,
        sessionTypeId: b.sessionTypeId,
        from: new Date(now).toISOString(),
        to: new Date(now + 14 * 86400000).toISOString(),
      });
      setSlots(list.filter((s) => s !== b.startAtUtc));
    } catch (e: any) {
      setSlotError(e.response?.data?.error || e.message || 'Could not load open slots.');
      setSlots([]);
    }
  };

  const doReschedule = async (startAtUtc: string) => {
    if (!rescheduleFor) return;
    setBusyBooking(rescheduleFor.id);
    setSlotError(null);
    try {
      await rescheduleTrainerBooking(rescheduleFor.id, startAtUtc);
      setRescheduleFor(null);
      setNotice('Booking moved — it is back to pending until you confirm it.');
      void load();
    } catch (e: any) {
      setSlotError(e.response?.data?.error || e.message || 'The booking could not be moved.');
    } finally {
      setBusyBooking(null);
    }
  };

  const visible = bookings.filter((b) => statusFilter === 'all' || b.status === statusFilter);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, gap: 16 }}>
        <Skeleton label="Loading your schedule" />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
      <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Schedule</Copy>
      <Copy tone="muted">Weekly availability ({timeZone}), session types, and booking requests.</Copy>

      {!!error && <Card><Notice error title="Something went wrong" message={error} /></Card>}
      {!!notice && <Card><Notice title="Done" message={notice} /></Card>}

      <Card>
        <Copy size="heading" accessibilityRole="header">Weekly availability</Copy>
        <Copy size="caption" tone="muted">Clients can book inside these windows (times in {timeZone}).</Copy>
        {WEEKDAYS.map(({ weekday, label }, i) => (
          <View key={weekday} style={{ gap: 4 }}>
            <Toggle label={label} value={week[i].enabled}
              onChange={(v) => setWeek(week.map((d, x) => (x === i ? { ...d, enabled: v } : d)))} />
            {week[i].enabled && (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field label={`${label} start`} value={week[i].start} placeholder="09:00" autoCapitalize="none"
                    onChangeText={(v) => setWeek(week.map((d, x) => (x === i ? { ...d, start: v } : d)))} />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label={`${label} end`} value={week[i].end} placeholder="17:00" autoCapitalize="none"
                    onChangeText={(v) => setWeek(week.map((d, x) => (x === i ? { ...d, end: v } : d)))} />
                </View>
              </View>
            )}
          </View>
        ))}
        <Action label={savingAvail ? 'Saving…' : 'Save availability'} disabled={savingAvail} onPress={() => void saveAvailability()} />
      </Card>

      <Card>
        <Copy size="heading" accessibilityRole="header">Session types</Copy>
        {sessionTypes.length === 0 && <Copy tone="muted">No session types yet — clients need at least one to book.</Copy>}
        {sessionTypes.map((t) => (
          <ListRow key={t.id} title={t.name}
            subtitle={`${t.durationMin} min · ${t.mode === 'in_person' ? 'in person' : 'virtual'}${t.active ? '' : ' · inactive'}`}
            onPress={() => openStEditor(t)} />
        ))}
        <Action secondary label="Add a session type" onPress={() => openStEditor()} />
      </Card>

      <Card>
        <Copy size="heading" accessibilityRole="header">Bookings</Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {STATUS_FILTERS.map((f) => (
            <Chip key={f} label={f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)} selected={statusFilter === f}
              accessibilityLabel={`Filter bookings: ${f}`} onPress={() => setStatusFilter(f)} />
          ))}
        </View>
        {visible.length === 0 && (
          <EmptyState title={statusFilter === 'all' ? 'No bookings yet' : `No ${statusFilter} bookings`}
            description="Client booking requests will show up here." />
        )}
        {visible.map((b) => {
          const client = (b.relation?.clientId && clientNames[b.relation.clientId]) || 'Client';
          const past = new Date(b.endAtUtc).getTime() < Date.now();
          return (
            <Card key={b.id} style={{ padding: 12, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Copy style={{ fontWeight: '600' }}>{b.sessionType?.name || 'Session'} · {client}</Copy>
                  <Copy size="caption" tone="muted">{fmtInstant(b.startAtUtc)}{b.clientNote ? ` · “${b.clientNote}”` : ''}</Copy>
                </View>
                <Chip small label={b.status} accessibilityLabel={`Status: ${b.status}`} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(b.status === 'requested' || b.status === 'rescheduled') && (
                  <>
                    <Chip label="Confirm" checkbox selected={false} accessibilityLabel={`Confirm ${client} booking`}
                      onPress={() => void bookingAction(b, 'confirm')} />
                    <Chip label="Decline" accessibilityLabel={`Decline ${client} booking`}
                      onPress={() => void bookingAction(b, 'decline')} />
                  </>
                )}
                {b.status === 'confirmed' && past && (
                  <Chip label="Complete" accessibilityLabel={`Mark ${client} session completed`}
                    onPress={() => void bookingAction(b, 'complete')} />
                )}
                {['requested', 'confirmed', 'rescheduled'].includes(b.status) && (
                  <>
                    <Chip label="Move" accessibilityLabel={`Reschedule ${client} booking`} onPress={() => void openReschedule(b)} />
                    <Chip label="Cancel" accessibilityLabel={`Cancel ${client} booking`} onPress={() => void bookingAction(b, 'cancel')} />
                  </>
                )}
                {busyBooking === b.id && <Copy size="caption" tone="muted">Updating…</Copy>}
              </View>
            </Card>
          );
        })}
      </Card>

      {/* Session type editor */}
      <Sheet visible={stDraft !== null} title={stDraft?.id ? 'Edit session type' : 'New session type'} onClose={() => setStDraft(null)}>
        {stDraft && (
          <>
            <Field label="Name" value={stDraft.name} onChangeText={(v) => setStDraft({ ...stDraft, name: v })} maxLength={128} placeholder="e.g. 1:1 coaching call" />
            <Field label="Duration (minutes)" value={stDraft.durationMin} onChangeText={(v) => setStDraft({ ...stDraft, durationMin: v })} keyboardType="number-pad" placeholder="60" />
            <Segmented label="Mode" value={stDraft.mode} onChange={(v) => setStDraft({ ...stDraft, mode: v })}
              options={[{ value: 'virtual', label: 'Virtual' }, { value: 'in_person', label: 'In person' }]} />
            {stDraft.mode === 'virtual' && (
              <Field label="Meeting link" value={stDraft.meetingLink} onChangeText={(v) => setStDraft({ ...stDraft, meetingLink: v })} maxLength={512} autoCapitalize="none" placeholder="https://…" />
            )}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}><Field label="Buffer (min)" value={stDraft.bufferMin} onChangeText={(v) => setStDraft({ ...stDraft, bufferMin: v })} keyboardType="number-pad" placeholder="0" /></View>
              <View style={{ flex: 1 }}><Field label="Min notice (min)" value={stDraft.minNoticeMin} onChangeText={(v) => setStDraft({ ...stDraft, minNoticeMin: v })} keyboardType="number-pad" placeholder="1440" /></View>
            </View>
            <Field label="Cancel window (min)" value={stDraft.cancelWindowMin} onChangeText={(v) => setStDraft({ ...stDraft, cancelWindowMin: v })} keyboardType="number-pad" placeholder="1440" />
            {!!stDraft.id && (
              <Toggle label="Accepting bookings" value={stDraft.active} onChange={(v) => setStDraft({ ...stDraft, active: v })} />
            )}
            <Action label={stBusy ? 'Saving…' : 'Save session type'} disabled={stBusy} onPress={() => void saveSessionType()} />
            {!!stDraft.id && <Action secondary label={stBusy ? 'Removing…' : 'Delete session type'} disabled={stBusy} onPress={() => {
              const existing = sessionTypes.find((t) => t.id === stDraft.id);
              if (existing) void removeSessionType(existing);
            }} />}
          </>
        )}
      </Sheet>

      {/* Reschedule */}
      <Sheet visible={rescheduleFor !== null} title="Move booking" onClose={() => setRescheduleFor(null)}>
        {rescheduleFor && (
          <>
            <Copy tone="muted">Pick a new start for {rescheduleFor.sessionType?.name || 'the session'} — it goes back to pending for your confirmation.</Copy>
            {!!slotError && <Notice error title="Could not move booking" message={slotError} />}
            {slots === null && !slotError && <Skeleton label="Finding open slots" />}
            {slots !== null && slots.length === 0 && !slotError && <Copy tone="muted">No open slots in the next 14 days.</Copy>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {(slots || []).map((s) => (
                <Chip key={s} label={fmtInstant(s)} disabled={busyBooking !== null}
                  accessibilityLabel={`Move to ${fmtInstant(s)}`} onPress={() => void doReschedule(s)} />
              ))}
            </View>
          </>
        )}
      </Sheet>
    </KeyboardAwareScrollView>
  );
}
