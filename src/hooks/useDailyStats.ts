import { useCallback, useEffect, useState, useRef } from 'react';
import {
  DailyStats,
  addWater as addWaterStore,
  loadDailyStats,
  subscribeDailyStats,
  toggleSupplement as toggleSupplementStore,
} from '../storage/dailyStats';
import { syncWater } from '../api/dailyStats';
import { getSession } from '../storage/session';
import { Supplement, logSupplement, deleteSupplementLog, getSupplementLogs } from '../api/supplements';

// Daily totals replace server state; preserve write order across hook instances.
let waterSyncQueue: Promise<unknown> = Promise.resolve();
function syncWaterInOrder(total: number) {
  const account = getSession()?.user.id;
  const send = () => {
    if (getSession()?.user.id !== account) throw new Error('Account changed');
    return syncWater(total);
  };
  const result = waterSyncQueue.then(send, send);
  waterSyncQueue = result.catch(() => {});
  return result;
}

interface UseDailyStats {
  stats: DailyStats | null;
  loading: boolean;
  waterSyncError: string | null;
  retryWaterSync: () => Promise<void>;
  addWater: (deltaMl: number) => Promise<DailyStats | undefined>;
  toggleSupplement: (s: Supplement, quantity: number) => Promise<void>;
  updateSupplementLog: (s: Supplement, quantity: number) => Promise<void>;
  refresh: () => Promise<void>;
}

/** Local supplement log ID cache: supplement name -> backend log id. */


/** Loads + mutates today's water intake and supplement checklist, syncing to backend. */
export function useDailyStats(includeSupplements = true): UseDailyStats {
  const supplementLogIds = useRef<Record<string,string>>({}).current;
  const waterBusy = useRef(false);
  const [waterSyncError, setWaterSyncError] = useState<string | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await loadDailyStats();
    setStats(s);
    setLoading(false);
    if (!includeSupplements) return;
    try {
      const logs = await getSupplementLogs();
      for (const log of logs) {
        supplementLogIds[log.supplementName] = log.id;
      }
    } catch {
      // best-effort
    }
  }, [includeSupplements, supplementLogIds]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => subscribeDailyStats(setStats), []);

  const retryWaterSync = useCallback(async () => {
    if (waterBusy.current) return;
    waterBusy.current = true;
    try {
      const current = await loadDailyStats();
      await syncWaterInOrder(current.waterMl);
      setWaterSyncError(null);
    } catch {
      setWaterSyncError('Saved on this device. Water has not synced. Retry when connected.');
    } finally { waterBusy.current = false; }
  }, []);

  const addWater = useCallback(async (deltaMl: number) => {
    // Prevent rapid repeated presses racing the local read/modify/write and server total.
    if (waterBusy.current) return;
    waterBusy.current = true;
    try {
      const next = await addWaterStore(deltaMl);
      setStats(next);
      try {
        await syncWaterInOrder(next.waterMl);
        setWaterSyncError(null);
      } catch {
        setWaterSyncError('Saved on this device. Water has not synced. Retry when connected.');
      }
      return next;
    } finally { waterBusy.current = false; }
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
  }, [supplementLogIds]);

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
  }, [stats, supplementLogIds]);

  return { stats, loading, waterSyncError, retryWaterSync, addWater, toggleSupplement, updateSupplementLog, refresh };
}
