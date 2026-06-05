import { useCallback, useEffect, useState } from 'react';
import { Supplement, addSupplement, listSupplements } from '../api/supplements';
import { DEFAULT_SUPPLEMENTS } from '../storage/dailyStats';

// Offline/initial fallback so the dashboard renders something even before the
// backend responds (or if it's unreachable).
const FALLBACK: Supplement[] = DEFAULT_SUPPLEMENTS.map((name) => ({
  id: name,
  name,
  category: null,
  defaultDose: null,
  isDefault: true,
}));

function sortCatalog(list: Supplement[]): Supplement[] {
  return [...list].sort(
    (a, b) =>
      Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name),
  );
}

interface UseSupplementCatalog {
  supplements: Supplement[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  add: (name: string) => Promise<Supplement>;
}

/**
 * Loads the supplement catalog from the backend (Postgres-backed) and lets the
 * user add new entries, which persist server-side and update the table.
 */
export function useSupplementCatalog(): UseSupplementCatalog {
  const [supplements, setSupplements] = useState<Supplement[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const list = await listSupplements();
      if (list.length) setSupplements(sortCatalog(list));
    } catch (e: any) {
      setError(e?.message ?? 'Could not load supplements');
      // Keep whatever we have (fallback or last good list).
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(async (name: string) => {
    const created = await addSupplement({ name });
    setSupplements((prev) => {
      const exists = prev.some(
        (s) => s.name.toLowerCase() === created.name.toLowerCase(),
      );
      const next = exists
        ? prev.map((s) =>
            s.name.toLowerCase() === created.name.toLowerCase() ? created : s,
          )
        : [...prev, created];
      return sortCatalog(next);
    });
    return created;
  }, []);

  return { supplements, loading, error, refresh, add };
}
