import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAvailableSlots, listMyBookings, requestBooking, SessionType } from '../api/bookings';
import { Action, Card, Copy, Field, Notice, Sheet, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Chip from '../components/Chip';
import EmptyState from '../components/ui-states/EmptyState';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';

function dayKey(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Client booking flow. Session types can't be enumerated client-side — they
 * arrive via route params (e.g. from a trainer surface) or are recovered from
 * the client's previous bookings with this trainer.
 */
export default function BookSessionScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const relationId: string = route.params?.relationId;
  const trainerId: string = route.params?.trainerId;
  const trainerName: string = route.params?.trainerName || 'your coach';
  const paramTypes: SessionType[] = route.params?.sessionTypes || [];

  const [sessionTypes, setSessionTypes] = useState<SessionType[]>(paramTypes.filter((t) => t.active !== false));
  const [selectedType, setSelectedType] = useState<SessionType | null>(sessionTypes[0] ?? null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);

  const [confirmSlot, setConfirmSlot] = useState<string | null>(null);
  const [clientNote, setClientNote] = useState('');
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);

  // Recover session types from prior bookings when none were passed in.
  useEffect(() => {
    let live = true;
    (async () => {
      if (sessionTypes.length) { setLoading(false); return; }
      try {
        const mine = await listMyBookings();
        if (!live) return;
        const seen = new Map<string, SessionType>();
        for (const b of mine) {
          if (b.relationId === relationId && b.sessionType) seen.set(b.sessionType.id, b.sessionType);
        }
        const recovered = [...seen.values()].filter((t) => t.active !== false);
        setSessionTypes(recovered);
        if (recovered.length) setSelectedType(recovered[0]);
      } catch (e: any) {
        if (live) setError(e.response?.data?.error || e.message || 'Could not load session types.');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSlots = useCallback(async (type: SessionType) => {
    setSlotsLoading(true);
    setSlotError(null);
    try {
      const now = Date.now();
      const list = await getAvailableSlots({
        trainerId,
        sessionTypeId: type.id,
        from: new Date(now).toISOString(),
        to: new Date(now + 14 * 86400000).toISOString(),
      });
      setSlots(list);
    } catch (e: any) {
      setSlots([]);
      setSlotError(e.response?.data?.error || e.message || 'Could not load open slots.');
    } finally {
      setSlotsLoading(false);
    }
  }, [trainerId]);

  useEffect(() => {
    setSlots(null);
    if (selectedType) void loadSlots(selectedType);
  }, [selectedType, loadSlots]);

  const byDay = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const s of slots || []) {
      const key = dayKey(s);
      groups.set(key, [...(groups.get(key) || []), s]);
    }
    return [...groups.entries()];
  }, [slots]);

  const confirm = async () => {
    if (!confirmSlot || !selectedType || booking) return;
    setBooking(true);
    setSlotError(null);
    try {
      await requestBooking({
        relationId,
        sessionTypeId: selectedType.id,
        startAtUtc: confirmSlot,
        ...(clientNote.trim() ? { clientNote: clientNote.trim() } : {}),
      });
      setBooked(true);
      setConfirmSlot(null);
    } catch (e: any) {
      setSlotError(e.response?.data?.error || e.message || 'The booking could not be requested.');
      setConfirmSlot(null);
      void loadSlots(selectedType);
    } finally {
      setBooking(false);
    }
  };

  if (booked) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24, gap: 12 }}>
        <EmptyState icon="✓" title="Session requested"
          description={`${trainerName} will confirm your ${selectedType?.name || 'session'}. You'll see it in your bookings.`}
          primaryCTA="View my bookings" onAction={() => navigation.navigate('MyBookings')}
          secondaryCTA="Done" onSecondaryAction={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
      <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Book a session</Copy>
      <Copy tone="muted">With {trainerName} · next 14 days</Copy>

      {!!error && <Card><Notice error title="Could not load booking options" message={error} /></Card>}

      {loading && <Skeleton label="Loading session types" />}

      {!loading && !error && sessionTypes.length === 0 && (
        <EmptyState title="Nothing to book yet"
          description="Your coach has not published any bookable session types you can see. Ask them to add one in their schedule settings." />
      )}

      {sessionTypes.length > 0 && (
        <Card>
          <Copy style={{ fontWeight: '700' }}>Session type</Copy>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {sessionTypes.map((t) => (
              <Chip key={t.id} label={`${t.name} · ${t.durationMin} min`} selected={selectedType?.id === t.id}
                accessibilityLabel={`${t.name}, ${t.durationMin} minutes`} onPress={() => setSelectedType(t)} />
            ))}
          </View>
          {!!selectedType && (
            <Copy size="caption" tone="muted">
              {selectedType.mode === 'in_person' ? 'In person' : 'Virtual'}
              {selectedType.minNoticeMin ? ` · ${Math.round(selectedType.minNoticeMin / 60)}h notice` : ''}
              {selectedType.cancelWindowMin ? ` · cancel up to ${Math.round(selectedType.cancelWindowMin / 60)}h before` : ''}
            </Copy>
          )}
        </Card>
      )}

      {!!slotError && <Card><Notice error title="Slot problem" message={slotError} /></Card>}
      {slotsLoading && <Skeleton label="Finding open times" />}

      {!slotsLoading && slots !== null && slots.length === 0 && selectedType && !slotError && (
        <EmptyState title="No open times" description="No bookable slots in the next 14 days for this session type." />
      )}

      {byDay.map(([day, times]) => (
        <Card key={day}>
          <Copy style={{ fontWeight: '700' }}>{day}</Copy>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {times.map((s) => (
              <Chip key={s} label={timeOf(s)} accessibilityLabel={`${day} at ${timeOf(s)}`} onPress={() => setConfirmSlot(s)} />
            ))}
          </View>
        </Card>
      ))}

      <Sheet visible={confirmSlot !== null} title="Confirm booking" onClose={() => setConfirmSlot(null)}>
        {confirmSlot && selectedType && (
          <>
            <Copy style={{ fontWeight: '600' }}>{selectedType.name}</Copy>
            <Copy tone="muted">{dayKey(confirmSlot)} at {timeOf(confirmSlot)} · {selectedType.durationMin} min · {selectedType.mode === 'in_person' ? 'in person' : 'virtual'}</Copy>
            <Field label="Note for your coach (optional)" value={clientNote} onChangeText={setClientNote} multiline maxLength={500}
              placeholder="Anything they should know before the session" />
            <Action label={booking ? 'Requesting…' : 'Request this time'} disabled={booking} onPress={() => void confirm()} />
          </>
        )}
      </Sheet>
    </KeyboardAwareScrollView>
  );
}
