import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { getFeatureConfig } from '../api/config';
import { loadFeatureConfig, saveFeatureConfig } from '../storage/featureConfig';
import { subscribeSession } from '../storage/session';
import { DEFAULT_FLAGS, FeatureKey, FeatureMap, buildGateAllows } from '../config/featureKeys';

const MAX_BACKOFF_MS = 5 * 60 * 1000;
// Hard floor between two network attempts regardless of trigger path
// (poll timer, foreground transition, session event, manual refresh).
const MIN_ATTEMPT_INTERVAL_MS = 10_000;

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

const sameFlags = (a: FeatureMap, b: FeatureMap) => {
  const ak = Object.keys(a) as FeatureKey[], bk = Object.keys(b);
  return ak.length === bk.length && ak.every((k) => a[k] === b[k]);
};

const retryAfterMs = (err: unknown): number | null => {
  const headers = (err as { response?: { headers?: Record<string, string> } })?.response?.headers;
  const raw = headers?.['retry-after'] ?? headers?.['Retry-After'];
  const secs = Number(raw);
  return Number.isFinite(secs) && secs > 0 ? Math.min(secs * 1000, MAX_BACKOFF_MS) : null;
};

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureMap>(DEFAULT_FLAGS);
  const [isLoading, setIsLoading] = useState(true);
  const refreshAfter = useRef(60_000);
  const failures = useRef(0);
  const mounted = useRef(false);
  const inFlight = useRef<Promise<void> | null>(null);
  const lastAttemptAt = useRef(0);
  const cooldownUntil = useRef(0); // Retry-After honored until this timestamp
  const sessionEpoch = useRef(0); // bumped on session change — stale responses dropped
  const hasConfig = useRef(false); // a fetch or cache load produced real values

  // Skip the state update when values are unchanged — prevents rerenders that
  // previously re-created refresh and restarted the polling loop.
  const applyFlags = useCallback((features: FeatureMap) => {
    hasConfig.current = true;
    setFlags((prev) => {
      const next = { ...DEFAULT_FLAGS, ...features };
      return sameFlags(prev, next) ? prev : next;
    });
  }, []);

  // Stable fetch: no `flags` dependency. One in-flight request max, min
  // interval between attempts, 429/Retry-After cooldown, epoch guard so a
  // response in flight during an account switch can't leak flags across users.
  const refresh = useCallback(async (force = false) => {
    if (inFlight.current) return inFlight.current;
    const now = Date.now();
    if (!force) {
      if (now < cooldownUntil.current) return;
      if (now - lastAttemptAt.current < MIN_ATTEMPT_INTERVAL_MS) return;
    }
    lastAttemptAt.current = now;
    const epoch = sessionEpoch.current;
    const task = (async () => {
      try {
        const data = await getFeatureConfig();
        if (!mounted.current || epoch !== sessionEpoch.current) return;
        failures.current = 0;
        refreshAfter.current = data.refreshAfterSeconds * 1000;
        applyFlags(data.features);
        await saveFeatureConfig(data.configVersion, data.features);
      } catch (err) {
        failures.current += 1;
        const ra = retryAfterMs(err);
        if (ra != null) cooldownUntil.current = Date.now() + ra;
        else if ((err as { response?: { status?: number } })?.response?.status === 429) {
          cooldownUntil.current = Date.now() + Math.min(refreshAfter.current * 2 ** failures.current, MAX_BACKOFF_MS);
        }
        if (!hasConfig.current) {
          const cached = await loadFeatureConfig();
          if (mounted.current && cached?.features && epoch === sessionEpoch.current) applyFlags(cached.features);
        }
      } finally {
        inFlight.current = null;
        if (mounted.current) setIsLoading(false);
      }
    })();
    inFlight.current = task;
    return task;
  }, [applyFlags]);

  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Single polling timer for the provider's lifetime. refreshAfterSeconds is
    // already bounded (30..600s) by the api layer; failures add exponential
    // backoff + jitter, and Retry-After cooldowns push the next tick out.
    const schedule = () => {
      if (!mounted.current) return;
      const base = refreshAfter.current;
      const backoff = Math.min(base * 2 ** failures.current, MAX_BACKOFF_MS);
      const jitter = backoff * 0.2 * Math.random();
      const wait = Math.max(backoff + jitter, cooldownUntil.current - Date.now());
      timer = setTimeout(async () => {
        if (AppState.currentState === 'active') await refresh();
        if (mounted.current) schedule();
      }, wait);
    };

    void (async () => {
      const epoch = sessionEpoch.current;
      const cached = await loadFeatureConfig();
      if (mounted.current && cached?.features && epoch === sessionEpoch.current) applyFlags(cached.features);
      await refresh(true); // initial fetch bypasses the min-interval floor
      schedule();
    })();

    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void refresh(); });
    const subSession = subscribeSession(() => {
      // Account switch/sign-out: drop user-scoped values immediately so flags
      // from the previous user are never applied to the next one.
      sessionEpoch.current += 1;
      failures.current = 0;
      cooldownUntil.current = 0;
      hasConfig.current = false;
      setFlags(DEFAULT_FLAGS);
      setIsLoading(true);
      void refresh(true);
    });
    return () => {
      mounted.current = false;
      if (timer) clearTimeout(timer);
      sub.remove();
      subSession();
    };
  }, [refresh, applyFlags]);

  const isEnabled = useCallback(
    (key: FeatureKey) => buildGateAllows(key) && flags[key] === true,
    [flags],
  );

  return (
    <FeatureFlagsContext.Provider value={{ isEnabled, isLoading, refresh: () => refresh(true) }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}
