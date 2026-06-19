import { useCallback, useEffect, useState } from 'react';
import {
  DailyStats,
  addWater as addWaterStore,
  loadDailyStats,
  toggleSupplement as toggleSupplementStore,
} from '../storage/dailyStats';
import { syncWater } from '../api/dailyStats';
import { logSupplement, deleteSupplementLog, getSupplementLogs } from '../api/supplements';
import { Supplement } from '../api/supplements';

interface UseDailyStats {
  stats: DailyStats | null;
  loading: boolean;
  addWater: (deltaMl: number) => Promise<void>;
  toggleSupplement: (s: Supplement, quantity: number) => Promise<void>;
  updateSupplementLog: (s: Supplement, quantity: number) => Promise<void>;
  refresh: () => Promise<void>;
}

/** Local supplement log ID cache: supplement name -> backend log id. */
const supplementLogIds: Record<string, string> = {};

/** Loads + mutates today's water intake and supplement checklist, syncing to backend. */
export function useDailyStats(): UseDailyStats {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await loadDailyStats();
    setStats(s);
    setLoading(false);
    try {
      const logs = await getSupplementLogs();
      for (const log of logs) {
        supplementLogIds[log.supplementName] = log.id;
      }
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addWater = useCallback(async (deltaMl: number) => {
    const next = await addWaterStore(deltaMl);
    setStats(next);
    try {
      await syncWater(next.waterMl);
    } catch {
      // best-effort sync
    }
  }, []);

  const toggleSupplement = useCallback(async (s: Supplement, quantity: number) => {
    const next = await toggleSupplementStore(s.name);
    setStats(next);
    try {
      if (next.supplements[s.name]) {
        // Marked as taken — create backend log
        if (s.userSupplementId) {
          const log = await logSupplement(s.userSupplementId, quantity);
          supplementLogIds[s.name] = log.id;
        }
      } else {
        // Marked as not taken — delete backend log
        const logId = supplementLogIds[s.name];
        if (logId) {
          await deleteSupplementLog(logId);
          delete supplementLogIds[s.name];
        }
      }
    } catch {
      // best-effort sync
    }
  }, []);

  const updateSupplementLog = useCallback(async (s: Supplement, quantity: number) => {
    if (!stats?.supplements[s.name]) return;
    try {
      const logId = supplementLogIds[s.name];
      if (logId) {
        await deleteSupplementLog(logId);
      }
      if (s.userSupplementId) {
        const log = await logSupplement(s.userSupplementId, quantity);
        supplementLogIds[s.name] = log.id;
      }
    } catch {
      // best-effort sync
    }
  }, [stats]);

  return { stats, loading, addWater, toggleSupplement, updateSupplementLog, refresh };
}
