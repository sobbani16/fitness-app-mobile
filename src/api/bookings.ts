import { api } from './client';
import { getDeviceId } from '../storage/device';

// ---------------------------------------------------------------------------
// Trainer scheduling — trainer side mounted at /trainer/schedule, client side
// at /me (bookings + available-slots). All instants are UTC ISO strings.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** weekday: 0=Sun..6=Sat; startMin/endMin are minutes from midnight (trainer tz). */
export interface AvailabilityWindow {
  id?: string;
  weekday: number;
  startMin: number;
  endMin: number;
  timeZone?: string;
}

export type SessionMode = 'virtual' | 'in_person';

export interface SessionType {
  id: string;
  trainerId?: string;
  name: string;
  durationMin: number;
  mode: string;
  meetingLink: string | null;
  bufferMin: number;
  minNoticeMin: number;
  cancelWindowMin: number;
  active: boolean;
}

export interface SessionTypePayload {
  name: string;
  durationMin: number;
  mode?: SessionMode;
  meetingLink?: string | null;
  bufferMin?: number;
  minNoticeMin?: number;
  cancelWindowMin?: number;
  active?: boolean;
}

export type BookingStatus = 'requested' | 'confirmed' | 'declined' | 'canceled' | 'completed' | 'rescheduled';

export interface Booking {
  id: string;
  relationId: string;
  sessionTypeId: string;
  startAtUtc: string;
  endAtUtc: string;
  status: string;
  requestedBy: string;
  meetingLink: string | null;
  clientNote: string | null;
  trainerNote: string | null;
  createdAt: string;
  updatedAt: string;
  sessionType?: SessionType;
  relation?: {
    id: string;
    clientId?: string;
    status?: string;
    trainer?: { id: string; userId?: string; displayName?: string | null };
  };
}

// ---------------------------------------------------------------------------
// Trainer side
// ---------------------------------------------------------------------------

async function authHeaders() {
  const userId = await getDeviceId();
  return { 'x-user-id': userId };
}

export async function getAvailability(): Promise<{ timeZone: string; windows: AvailabilityWindow[] }> {
  const headers = await authHeaders();
  const res = await api.get<{ timeZone: string; windows: AvailabilityWindow[] }>('/trainer/schedule/availability', { headers });
  return res.data;
}

/** Replace-all weekly availability. */
export async function putAvailability(windows: AvailabilityWindow[], timeZone?: string): Promise<AvailabilityWindow[]> {
  const headers = await authHeaders();
  const res = await api.put<{ availability: AvailabilityWindow[] }>(
    '/trainer/schedule/availability',
    { windows, ...(timeZone ? { timeZone } : {}) },
    { headers },
  );
  return res.data.availability;
}

export async function listSessionTypes(): Promise<SessionType[]> {
  const headers = await authHeaders();
  const res = await api.get<{ sessionTypes: SessionType[] }>('/trainer/schedule/session-types', { headers });
  return res.data.sessionTypes;
}

export async function createSessionType(payload: SessionTypePayload): Promise<SessionType> {
  const headers = await authHeaders();
  const res = await api.post<SessionType>('/trainer/schedule/session-types', payload, { headers });
  return res.data;
}

export async function updateSessionType(id: string, payload: Partial<SessionTypePayload>): Promise<SessionType> {
  const headers = await authHeaders();
  const res = await api.patch<SessionType>(`/trainer/schedule/session-types/${encodeURIComponent(id)}`, payload, { headers });
  return res.data;
}

export async function deleteSessionType(id: string): Promise<{ deleted: boolean; deactivated?: boolean; sessionType?: SessionType }> {
  const headers = await authHeaders();
  const res = await api.delete<{ deleted: boolean; deactivated?: boolean; sessionType?: SessionType }>(
    `/trainer/schedule/session-types/${encodeURIComponent(id)}`,
    { headers },
  );
  return res.data;
}

export async function listTrainerBookings(status?: BookingStatus): Promise<Booking[]> {
  const headers = await authHeaders();
  const res = await api.get<{ bookings: Booking[] }>('/trainer/schedule/bookings', {
    headers,
    params: status ? { status } : {},
  });
  return res.data.bookings;
}

export async function respondToBooking(id: string, action: 'confirm' | 'decline'): Promise<Booking> {
  const headers = await authHeaders();
  const res = await api.post<Booking>(`/trainer/schedule/bookings/${encodeURIComponent(id)}/respond`, { action }, { headers });
  return res.data;
}

export async function cancelTrainerBooking(id: string): Promise<Booking> {
  const headers = await authHeaders();
  const res = await api.post<Booking>(`/trainer/schedule/bookings/${encodeURIComponent(id)}/cancel`, {}, { headers });
  return res.data;
}

export async function rescheduleTrainerBooking(id: string, startAtUtc: string): Promise<Booking> {
  const headers = await authHeaders();
  const res = await api.post<Booking>(`/trainer/schedule/bookings/${encodeURIComponent(id)}/reschedule`, { startAtUtc }, { headers });
  return res.data;
}

export async function completeTrainerBooking(id: string): Promise<Booking> {
  const headers = await authHeaders();
  const res = await api.post<Booking>(`/trainer/schedule/bookings/${encodeURIComponent(id)}/complete`, {}, { headers });
  return res.data;
}

// ---------------------------------------------------------------------------
// Client side
// ---------------------------------------------------------------------------

/** Bookable slot starts (ISO UTC) for one session type. Max range is 14 days. */
export async function getAvailableSlots(params: {
  trainerId: string;
  from: string;
  to: string;
  sessionTypeId: string;
}): Promise<string[]> {
  const headers = await authHeaders();
  const res = await api.get<{ slots: string[] }>('/me/available-slots', { headers, params });
  return res.data.slots;
}

export async function requestBooking(payload: {
  relationId: string;
  sessionTypeId: string;
  startAtUtc: string;
  clientNote?: string;
}): Promise<Booking> {
  const headers = await authHeaders();
  const res = await api.post<Booking>('/me/bookings', payload, { headers });
  return res.data;
}

export async function listMyBookings(): Promise<Booking[]> {
  const headers = await authHeaders();
  const res = await api.get<{ bookings: Booking[] }>('/me/bookings', { headers });
  return res.data.bookings;
}

export async function cancelMyBooking(id: string): Promise<Booking> {
  const headers = await authHeaders();
  const res = await api.post<Booking>(`/me/bookings/${encodeURIComponent(id)}/cancel`, {}, { headers });
  return res.data;
}

export async function rescheduleMyBooking(id: string, startAtUtc: string): Promise<Booking> {
  const headers = await authHeaders();
  const res = await api.post<Booking>(`/me/bookings/${encodeURIComponent(id)}/reschedule`, { startAtUtc }, { headers });
  return res.data;
}
