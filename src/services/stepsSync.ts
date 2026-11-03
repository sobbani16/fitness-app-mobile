import { syncSteps } from '../api/dailyStats';
import { getSession } from '../storage/session';
import { classifyFailure, FailureCategory } from './apiDiagnostics';

export function localDateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MIN_INTERVAL_MS = 60000;
let last: { account: string; date: string; steps: number; at: number } | null = null;
let inFlight: Promise<StepsSyncResult> | null = null;
export type StepsSyncResult = { status: 'synced' | 'skipped' } | { status: 'failed'; category: FailureCategory };

/**
 * Sends the device total for the user's local day. The server replaces (never
 * adds) the day's device row, so repeats cannot accumulate. Throttled so a
 * live pedometer cannot exhaust the per-account request budget.
 */
export function syncDeviceSteps(steps: number, { force = false, now = new Date() } = {}): Promise<StepsSyncResult> {
  const account = getSession()?.user.id;
  if (!account || !Number.isInteger(steps) || steps <= 0) return Promise.resolve({ status: 'skipped' });
  const date = localDateKey(now);
  const sameDay = last?.account === account && last.date === date;
  if (sameDay && last!.steps === steps) return Promise.resolve({ status: 'skipped' });
  if (!force && sameDay && now.getTime() - last!.at < MIN_INTERVAL_MS) return Promise.resolve({ status: 'skipped' });
  if (inFlight) return inFlight;
  inFlight = syncSteps(steps, date)
    .then((): StepsSyncResult => {
      if (getSession()?.user.id === account) last = { account, date, steps, at: now.getTime() };
      return { status: 'synced' };
    })
    .catch((error): StepsSyncResult => ({ status: 'failed', category: classifyFailure(error) }))
    .finally(() => { inFlight = null; });
  return inFlight;
}

export function resetStepsSync() { last = null; inFlight = null; }
