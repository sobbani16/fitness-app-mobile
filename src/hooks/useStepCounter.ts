import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UseStepCounter {
  steps: number;
  available: boolean;
  error: string | null;
}

// Loaded lazily so the app keeps working even if expo-sensors isn't
// linked in the current runtime (e.g. a stripped build or web).
function loadPedometer(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sensors = require('expo-sensors');
    return sensors?.Pedometer ?? null;
  } catch {
    return null;
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `fitness.steps.v1.${yyyy}-${mm}-${dd}`;
}

async function loadPersistedSteps(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(todayKey());
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

async function persistSteps(total: number): Promise<void> {
  try {
    await AsyncStorage.setItem(todayKey(), String(total));
  } catch {
    // best-effort
  }
}

/**
 * Live step count for today. Uses the device pedometer when available.
 *
 * - iOS: reads today's historical total via getStepCountAsync, then keeps it
 *   live via watchStepCount.
 * - Android: getStepCountAsync requires Health Connect. If unavailable, we
 *   persist step counts locally so they survive app restarts. The live watch
 *   adds new steps on top of the persisted base.
 * - Anywhere the sensor/module is missing: `available=false`, steps stay 0.
 */
export function useStepCounter(): UseStepCounter {
  const [steps, setSteps] = useState(0);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseRef = useRef(0); // historical steps before live watch began
  const historicalLoaded = useRef(false);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const Pedometer = loadPedometer();
      if (!Pedometer) {
        if (!cancelled) setAvailable(false);
        return;
      }
      try {
        const isAvailable = await Pedometer.isAvailableAsync();
        if (!isAvailable) {
          if (!cancelled) setAvailable(false);
          return;
        }

        // Permissions (no-op on platforms that don't require it).
        if (Pedometer.requestPermissionsAsync) {
          const perm = await Pedometer.requestPermissionsAsync();
          if (perm && perm.granted === false) {
            if (!cancelled) {
              setAvailable(false);
              setError('Motion permission denied');
            }
            return;
          }
        }

        if (cancelled) return;
        setAvailable(true);

        // Read today's historical step count (iOS and Android 10+).
        // On Android this requires Health Connect; falls back to persisted count.
        let gotHistorical = false;
        if (Pedometer.getStepCountAsync) {
          try {
            const result = await Pedometer.getStepCountAsync(startOfToday(), new Date());
            const n = Number(result?.steps) || 0;
            if (n > 0) {
              baseRef.current = n;
              historicalLoaded.current = true;
              gotHistorical = true;
              if (!cancelled) setSteps(n);
              persistSteps(n);
            }
          } catch {
            // Health Connect / Google Fit not available
          }
        }

        // Fallback (Android without Health Connect): load persisted count.
        if (!gotHistorical) {
          const persisted = await loadPersistedSteps();
          baseRef.current = persisted;
          if (!cancelled) setSteps(persisted);
        }

        sub = Pedometer.watchStepCount((res: { steps: number }) => {
          const delta = Number(res?.steps) || 0;
          const total = baseRef.current + delta;
          setSteps(total);
          // Persist so reopening the app doesn't lose the count.
          persistSteps(total);
        });
      } catch (e: any) {
        if (!cancelled) {
          setAvailable(false);
          setError(e?.message ?? 'Pedometer error');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (sub) sub.remove();
    };
  }, []);

  return { steps, available, error };
}
