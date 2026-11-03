import { clientBuild, CLIENT_API_CONTRACT } from '../config/buildInfo';

export type FailureCategory = 'network' | 'timeout' | 'auth' | 'forbidden' | 'not_found' | 'validation' | 'conflict' | 'rate_limited' | 'upgrade_required' | 'server' | 'unavailable' | 'unknown';
export interface ApiFailure {
  at: string; method: string; endpoint: string; status: number | null; category: FailureCategory;
  code: string | null; correlationId: string | null; durationMs: number | null; serverContract: string | null; retry: number;
}

const ID_SEGMENT = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{16,}|\d+|[A-Za-z0-9_-]{20,})$/i;
const MAX = 50;
let entries: ApiFailure[] = [];
const listeners = new Set<() => void>();

/** Path template with identifiers and query values removed. */
export function endpointLabel(url: string | undefined): string {
  const path = (url || '').replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0];
  return path.split('/').map(seg => (ID_SEGMENT.test(seg) ? ':id' : seg)).join('/').slice(0, 120) || '/';
}

/** Classify an axios-like error; anything without a response is a transport failure. */
export function classifyFailure(error: any): FailureCategory {
  const status: number | undefined = error?.response?.status;
  if (!status) {
    if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT' || /timeout/i.test(String(error?.message || ''))) return 'timeout';
    return error?.isAxiosError || error?.request || /network/i.test(String(error?.message || '')) ? 'network' : 'unknown';
  }
  if (status === 401) return 'auth';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 426) return 'upgrade_required';
  if (status === 429) return 'rate_limited';
  if (status === 503 || status === 502 || status === 504) return 'unavailable';
  if (status >= 500) return 'server';
  if (status >= 400) return 'validation';
  return 'unknown';
}

/** Worth retrying later without the user changing anything. */
export function isTransient(category: FailureCategory): boolean {
  return ['network', 'timeout', 'rate_limited', 'server', 'unavailable', 'unknown'].includes(category);
}

export function recordFailure(error: any, retry = 0): ApiFailure {
  const config = error?.config || {};
  const headers = error?.response?.headers || {};
  const started = Number(config.metadata?.startedAt);
  const code = error?.response?.data?.code;
  noteServerContract(headers);
  const entry: ApiFailure = {
    at: new Date().toISOString(),
    method: String(config.method || 'get').toUpperCase(),
    endpoint: endpointLabel(config.url),
    status: error?.response?.status ?? null,
    category: classifyFailure(error),
    code: typeof code === 'string' && /^[A-Z_]{2,40}$/.test(code) ? code : null,
    correlationId: (headers['x-correlation-id'] || config.headers?.['x-correlation-id'] || null) as string | null,
    durationMs: Number.isFinite(started) ? Date.now() - started : null,
    serverContract: (headers['x-api-contract'] as string) || null,
    retry,
  };
  entries = [entry, ...entries].slice(0, MAX);
  listeners.forEach(fn => fn());
  return entry;
}

let contract: { server: number | null; minClient: number | null } = { server: null, minClient: null };
/** Remember the backend contract advertised on any response (success or failure). */
export function noteServerContract(headers: any) {
  const server = Number(headers?.['x-api-contract']), minClient = Number(headers?.['x-min-client-contract']);
  if (!Number.isInteger(server)) return;
  const next = { server, minClient: Number.isInteger(minClient) ? minClient : null };
  if (next.server !== contract.server || next.minClient !== contract.minClient) { contract = next; listeners.forEach(fn => fn()); }
}
export type Compatibility = 'compatible' | 'unknown' | 'server_outdated' | 'update_app';
/** unknown = no versioned response seen yet (or a backend that predates versioning). */
export function compatibility(): Compatibility {
  if (contract.server == null) return 'unknown';
  if (contract.minClient != null && CLIENT_API_CONTRACT < contract.minClient) return 'update_app';
  if (contract.server < CLIENT_API_CONTRACT) return 'server_outdated';
  return 'compatible';
}
export const serverContract = () => contract.server;
export function resetDiagnostics() { entries = []; contract = { server: null, minClient: null }; }

export const recentFailures = () => entries;
export function clearFailures() { entries = []; listeners.forEach(fn => fn()); }
export function subscribeFailures(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

/** Shareable plain-text report: no tokens, bodies, identifiers or health values. */
export function diagnosticReport(extra: Record<string, string | number | null> = {}): string {
  const lines = [`Humai diagnostics · build ${clientBuild()} · client contract ${CLIENT_API_CONTRACT} · server contract ${contract.server ?? 'unknown'} (${compatibility()}) · ${new Date().toISOString()}`];
  for (const [k, v] of Object.entries(extra)) lines.push(`${k}: ${v ?? 'unknown'}`);
  lines.push(entries.length ? 'Recent API failures (newest first):' : 'No recent API failures.');
  for (const e of entries.slice(0, 20)) {
    lines.push(`${e.at} ${e.method} ${e.endpoint} → ${e.status ?? 'no response'} ${e.category}${e.code ? ` ${e.code}` : ''}${e.durationMs != null ? ` ${e.durationMs}ms` : ''}${e.retry ? ` retry ${e.retry}` : ''} id=${e.correlationId ?? 'none'}`);
  }
  return lines.join('\n');
}
