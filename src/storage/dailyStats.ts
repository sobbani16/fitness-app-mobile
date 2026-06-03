import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'fitness.dailyStats.v1.';

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
  return `${KEY_PREFIX}${isoDate(d)}`;
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
  await AsyncStorage.setItem(keyFor(d), JSON.stringify(stats));
}

export async function addWater(deltaMl: number, d: Date = new Date()): Promise<DailyStats> {
  const stats = await loadDailyStats(d);
  const next: DailyStats = { ...stats, waterMl: Math.max(0, stats.waterMl + deltaMl) };
  await saveDailyStats(next, d);
  return next;
}

export async function toggleSupplement(name: string, d: Date = new Date()): Promise<DailyStats> {
  const stats = await loadDailyStats(d);
  const next: DailyStats = {
    ...stats,
    supplements: { ...stats.supplements, [name]: !stats.supplements[name] },
  };
  await saveDailyStats(next, d);
  return next;
}
