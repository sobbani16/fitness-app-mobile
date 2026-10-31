import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { getFeatureConfig } from '../api/config';
import { loadFeatureConfig, saveFeatureConfig } from '../storage/featureConfig';
import { subscribeSession } from '../storage/session';
import { DEFAULT_FLAGS, FeatureKey, FeatureMap, buildGateAllows } from '../config/featureKeys';

const MAX_BACKOFF_MS = 5 * 60 * 1000;

interface FeatureFlagsContextValue {
  isEnabled: (key: FeatureKey) => boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  isEnabled: () => false,
  isLoading: true,
  refresh: async () => {},
});

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureMap>(DEFAULT_FLAGS);
  const [isLoading, setIsLoading] = useState(true);
  const refreshAfter = useRef(60_000);
  const failures = useRef(0);
  const mounted = useRef(true);

  // Last-known-good cache first, then a network fetch. Provider errors never
  // clear flags — the registry defaults already fail the right way.
  const refresh = useCallback(async () => {
    try {
      const data = await getFeatureConfig();
      if (!mounted.current) return;
      failures.current = 0;
      refreshAfter.current = data.refreshAfterSeconds * 1000;
      setFlags({ ...DEFAULT_FLAGS, ...data.features });
      await saveFeatureConfig(data.configVersion, data.features);
    } catch {
      failures.current += 1;
      if (!flags || Object.keys(flags).length === 0) {
        const cached = await loadFeatureConfig();
        if (mounted.current && cached?.features) setFlags({ ...DEFAULT_FLAGS, ...cached.features });
      }
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, [flags]);

  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      const cached = await loadFeatureConfig();
      if (mounted.current && cached?.features) setFlags({ ...DEFAULT_FLAGS, ...cached.features });
      await refresh();
    })();

    // Poll while active: refreshAfterSeconds + up to 20% jitter, exponential
    // backoff on failures. Suspended apps don't poll (timer only reschedules
    // on foreground transitions).
    const schedule = () => {
      const base = refreshAfter.current;
      const backoff = Math.min(base * 2 ** failures.current, MAX_BACKOFF_MS);
      const jitter = backoff * 0.2 * Math.random();
      timer = setTimeout(async () => {
        if (AppState.currentState === 'active') await refresh();
        schedule();
      }, backoff + jitter);
    };
    schedule();

    const sub = AppState.addEventListener('change', s => { if (s === 'active') void refresh(); });
    const subSession = subscribeSession(() => { failures.current = 0; void refresh(); });
    return () => {
      mounted.current = false;
      if (timer) clearTimeout(timer);
      sub.remove();
      subSession();
    };
  }, [refresh]);

  const isEnabled = useCallback(
    (key: FeatureKey) => buildGateAllows(key) && flags[key] === true,
    [flags],
  );

  return (
    <FeatureFlagsContext.Provider value={{ isEnabled, isLoading, refresh }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}
