import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Supplement,
  getMySupplements,
  searchSupplements,
  selectSupplement as apiSelect,
  deselectSupplement as apiDeselect,
} from '../api/supplements';

interface UseSupplementCatalog {
  /** User's selected supplements (shown on dashboard). */
  mySupplements: Supplement[];
  /** Search results from the global catalog. */
  searchResults: Supplement[];
  searching: boolean;
  loading: boolean;
  error: string | null;
  /** Refresh user's selected supplements from the backend. */
  refresh: () => Promise<void>;
  /** Search the global catalog. */
  search: (q: string) => void;
  /** Add a supplement to user's selected list. */
  select: (supplement: Supplement) => Promise<void>;
  /** Remove a supplement from user's selected list. */
  deselect: (supplementId: string) => Promise<void>;
}

/**
 * Manages the user's selected supplements and searches the global catalog.
 * - `mySupplements`: user's picks (shown on dashboard with checkboxes)
 * - `search(q)`: debounced search against the global catalog
 * - `select/deselect`: add/remove from user's list
 */
export function useSupplementCatalog(): UseSupplementCatalog {
  const [mySupplements, setMySupplements] = useState<Supplement[]>([]);
  const [searchResults, setSearchResults] = useState<Supplement[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const list = await getMySupplements();
      setMySupplements(list);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load supplements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const search = useCallback((q: string) => {
    if (timer.current) clearTimeout(timer.current);
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const results = await searchSupplements(trimmed);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const select = useCallback(async (supplement: Supplement) => {
    await apiSelect(supplement.id);
    setMySupplements((prev) => {
      if (prev.some((s) => s.id === supplement.id)) return prev;
      return [...prev, supplement].sort((a, b) => a.name.localeCompare(b.name));
    });
    setSearchResults([]);
  }, []);

  const deselect = useCallback(async (supplementId: string) => {
    await apiDeselect(supplementId);
    setMySupplements((prev) => prev.filter((s) => s.id !== supplementId));
  }, []);

  return {
    mySupplements,
    searchResults,
    searching,
    loading,
    error,
    refresh,
    search,
    select,
    deselect,
  };
}
