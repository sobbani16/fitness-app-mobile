import { classifyFailure, FailureCategory, isTransient } from '../services/apiDiagnostics';

export type TaskOutcome = { ok: true } | { ok: false; category: FailureCategory };
export type RefreshResult = Record<string, TaskOutcome>;
type Task = () => Promise<unknown>;

/**
 * Runs named refresh tasks independently. A task already in flight is joined,
 * not restarted; each result reports exactly which parts failed and why.
 */
export function createRefreshCoordinator(tasks: Record<string, Task>) {
  const inFlight = new Map<string, Promise<TaskOutcome>>();
  const runOne = (key: string): Promise<TaskOutcome> => {
    const existing = inFlight.get(key);
    if (existing) return existing;
    const run = Promise.resolve().then(tasks[key])
      .then((): TaskOutcome => ({ ok: true }))
      .catch((error): TaskOutcome => ({ ok: false, category: (error?.category as FailureCategory) || classifyFailure(error) }))
      .finally(() => { inFlight.delete(key); });
    inFlight.set(key, run);
    return run;
  };
  return {
    async run(keys: string[] = Object.keys(tasks)): Promise<RefreshResult> {
      const known = keys.filter(k => tasks[k]);
      const outcomes = await Promise.all(known.map(runOne));
      return Object.fromEntries(known.map((k, i) => [k, outcomes[i]]));
    },
    busy: () => inFlight.size > 0,
  };
}

export interface ConnectionSummary {
  state: 'ok' | 'offline' | 'partial';
  failed: string[];
  transientOnly: boolean;
}

/** One status for the whole screen instead of a failure card per feature. */
export function summarize(result: RefreshResult): ConnectionSummary {
  const entries = Object.entries(result);
  const failed = entries.filter(([, o]) => !o.ok).map(([k]) => k);
  const categories = entries.flatMap(([, o]) => (o.ok ? [] : [o.category]));
  const transientOnly = categories.every(isTransient);
  if (!failed.length) return { state: 'ok', failed, transientOnly: true };
  const unreachable = categories.every(c => c === 'network' || c === 'timeout' || c === 'unavailable');
  return { state: failed.length === entries.length && unreachable ? 'offline' : 'partial', failed, transientOnly };
}

/** Exponential backoff for automatic retries; null once the bound is reached. */
export function retryDelay(attempt: number, base = 5000, max = 3): number | null {
  return attempt < max ? base * 3 ** attempt : null;
}
