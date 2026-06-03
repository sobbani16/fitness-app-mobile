import { useCallback, useEffect, useState } from 'react';
import {
  DailyStats,
  addWater as addWaterStore,
  loadDailyStats,
  toggleSupplement as toggleSupplementStore,
} from '../storage/dailyStats';

interface UseDailyStats {
  stats: DailyStats | null;
  loading: boolean;
  addWater: (deltaMl: number) => Promise<void>;
  toggleSupplement: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/** Loads + mutates today's water intake and supplement checklist. */
export function useDailyStats(): UseDailyStats {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await loadDailyStats();
    setStats(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addWater = useCallback(async (deltaMl: number) => {
    const next = await addWaterStore(deltaMl);
    setStats(next);
  }, []);

  const toggleSupplement = useCallback(async (name: string) => {
    const next = await toggleSupplementStore(name);
    setStats(next);
  }, []);

  return { stats, loading, addWater, toggleSupplement, refresh };
}
