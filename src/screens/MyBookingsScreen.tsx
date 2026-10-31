import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Booking,
  cancelMyBooking,
  getAvailableSlots,
  listMyBookings,
  rescheduleMyBooking,
} from '../api/bookings';
import { Action, Card, Copy, Notice, Sheet, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Chip from '../components/Chip';
import EmptyState from '../components/ui-states/EmptyState';

const UPCOMING = ['requested', 'confirmed', 'rescheduled'];
const OPEN = UPCOMING; // statuses that can still be canceled/moved

function fmtInstant(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function MyBookingsScreen() {
  const { colors } = useTheme();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [rescheduleFor, setRescheduleFor] = useState<Booking | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setBookings(await listMyBookings());
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Could not load bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const cancel = async (b: Booking) => {
    setBusyId(b.id);
    setError(null);
    setNotice(null);
    try {
      await cancelMyBooking(b.id);
      setNotice('Booking canceled.');
      void load();
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'The booking could not be canceled.');
    } finally {
      setBusyId(null);
    }
  };

  const openReschedule = async (b: Booking) => {
    setRescheduleFor(b);
    setSlots(null);
    setSlotError(null);
    const trainerId = b.relation?.trainer?.id;
    if (!trainerId) { setSlotError('Could not resolve the trainer for slot lookup.'); return; }
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
    setBusyId(rescheduleFor.id);
    setSlotError(null);
    try {
      await rescheduleMyBooking(rescheduleFor.id, startAtUtc);
      setRescheduleFor(null);
      setNotice('New time requested — your coach will confirm it.');
      void load();
    } catch (e: any) {
      setSlotError(e.response?.data?.error || e.message || 'The booking could not be moved.');
    } finally {
      setBusyId(null);
    }
  };

  const now = Date.now();
  const upcoming = bookings.filter((b) => UPCOMING.includes(b.status) && new Date(b.startAtUtc).getTime() >= now);
  const rest = bookings.filter((b) => !upcoming.includes(b));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={loading ? [] : [...upcoming, ...rest]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 4 }}>
            <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>My bookings</Copy>
            <Copy tone="muted">Requested and confirmed sessions with your coach.</Copy>
            {!!error && <Card><Notice error title="Something went wrong" message={error} /><Action label="Retry" onPress={() => void load()} /></Card>}
            {!!notice && <Card><Notice title="Done" message={notice} /></Card>}
          </View>
        }
        ListEmptyComponent={
          loading ? <Skeleton label="Loading your bookings" /> : error ? null : (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState title="No bookings yet" description="Book a session with your coach and it will show up here." />
            </View>
          )
        }
        renderItem={({ item }) => {
          const upcomingItem = OPEN.includes(item.status) && new Date(item.startAtUtc).getTime() >= now;
          const trainer = item.relation?.trainer?.displayName || 'Coach';
          return (
            <Card style={{ padding: 14, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Copy style={{ fontWeight: '600' }}>{item.sessionType?.name || 'Session'}</Copy>
                  <Copy size="caption" tone="muted">{trainer} · {fmtInstant(item.startAtUtc)}</Copy>
                </View>
                <Chip small label={item.status} accessibilityLabel={`Status: ${item.status}`} />
              </View>
              {!!item.meetingLink && item.status === 'confirmed' && (
                <Copy size="caption" tone="muted" selectable>Link: {item.meetingLink}</Copy>
              )}
              {upcomingItem && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Chip label="Move" accessibilityLabel={`Reschedule session with ${trainer}`} onPress={() => void openReschedule(item)} />
                  <Chip label="Cancel" accessibilityLabel={`Cancel session with ${trainer}`}
                    disabled={busyId === item.id} onPress={() => void cancel(item)} />
                  {busyId === item.id && <Copy size="caption" tone="muted">Updating…</Copy>}
                </View>
              )}
            </Card>
          );
        }}
      />

      <Sheet visible={rescheduleFor !== null} title="Pick a new time" onClose={() => setRescheduleFor(null)}>
        {rescheduleFor && (
          <>
            <Copy tone="muted">Your coach will re-confirm the moved session.</Copy>
            {!!slotError && <Notice error title="Could not move booking" message={slotError} />}
            {slots === null && !slotError && <Skeleton label="Finding open slots" />}
            {slots !== null && slots.length === 0 && !slotError && <Copy tone="muted">No open slots in the next 14 days.</Copy>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {(slots || []).map((s) => (
                <Chip key={s} label={fmtInstant(s)} disabled={busyId !== null}
                  accessibilityLabel={`Move to ${fmtInstant(s)}`} onPress={() => void doReschedule(s)} />
              ))}
            </View>
          </>
        )}
      </Sheet>
    </View>
  );
}
