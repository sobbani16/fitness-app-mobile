import { accountKey } from './session';
import { accountStorage as AsyncStorage } from './accountStorage';

const KEY_PREFIX = 'fitness.dailyStats.v1.';
const listeners = new Set<(stats: DailyStats, key: string) => void>();

/** Keep mounted Today and Quick Add consumers in sync for this account/day. */
export function subscribeDailyStats(listener: (stats: DailyStats) => void) {
  const accountPrefix = accountKey(KEY_PREFIX);
  const receive = (stats: DailyStats, key: string) => {
    if (key === `${accountPrefix}${isoDate()}`) listener(stats);
  };
  listeners.add(receive);
  return () => { listeners.delete(receive); };
}

/** Default supplements tracked on the dashboard. */
export const DEFAULT_SUPPLEMENTS = [
  'Creatine',
  'Fish oil',
  'Vitamin D',
  'Protein',
  'Multivitamin',
] as const;

export const GLASS_ML = 250;

export interface DailyStats {
  date: string;            // YYYY-MM-DD
  waterMl: number;         // total water consumed today
  supplements: Record<string, boolean>; // name -> taken
}

function isoDate(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function keyFor(d: Date = new Date()): string {
  return accountKey(`${KEY_PREFIX}${isoDate(d)}`);
}

function emptyStats(d: Date = new Date()): DailyStats {
  return { date: isoDate(d), waterMl: 0, supplements: {} };
}

export async function loadDailyStats(d: Date = new Date()): Promise<DailyStats> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(d));
    if (!raw) return emptyStats(d);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyStats(d);
    return {
      date: parsed.date ?? isoDate(d),
      waterMl: Number(parsed.waterMl) || 0,
      supplements: parsed.supplements && typeof parsed.supplements === 'object' ? parsed.supplements : {},
    };
  } catch {
    return emptyStats(d);
  }
}

export async function saveDailyStats(stats: DailyStats, d: Date = new Date()): Promise<void> {
  const key = keyFor(d);
  await AsyncStorage.setItem(key, JSON.stringify(stats));
  listeners.forEach(listener => listener(stats, key));
}

// Mutations are read-modify-write; serialize them so separate hook instances
// (Dashboard card, Quick Add sheet) cannot lose a concurrent update.
let mutations: Promise<unknown> = Promise.resolve();
function mutate<T>(action: () => Promise<T>): Promise<T> {
  const result = mutations.then(action, action);
  mutations = result.catch(() => {});
  return result;
}

export function addWater(deltaMl: number, d: Date = new Date()): Promise<DailyStats> {
  return mutate(async () => {
    const stats = await loadDailyStats(d);
    const next: DailyStats = { ...stats, waterMl: Math.max(0, stats.waterMl + deltaMl) };
    await saveDailyStats(next, d);
    return next;
  });
}

export function toggleSupplement(name: string, d: Date = new Date()): Promise<DailyStats> {
  return mutate(async () => {
    const stats = await loadDailyStats(d);
    const next: DailyStats = {
      ...stats,
      supplements: { ...stats.supplements, [name]: !stats.supplements[name] },
    };
    await saveDailyStats(next, d);
    return next;
  });
}
