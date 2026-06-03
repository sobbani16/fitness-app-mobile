import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

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

/**
 * Live step count for today. Uses the device pedometer when available.
 *
 * - iOS: reads today's historical total via getStepCountAsync, then keeps it
 *   live via watchStepCount.
 * - Android: getStepCountAsync isn't supported, so steps accumulate from the
 *   moment the subscription starts.
 * - Anywhere the sensor/module is missing: `available=false`, steps stay 0.
 */
export function useStepCounter(): UseStepCounter {
  const [steps, setSteps] = useState(0);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseRef = useRef(0); // historical steps before live watch began

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

        // iOS supports historical reads for today.
        if (Platform.OS === 'ios' && Pedometer.getStepCountAsync) {
          try {
            const result = await Pedometer.getStepCountAsync(startOfToday(), new Date());
            const n = Number(result?.steps) || 0;
            baseRef.current = n;
            if (!cancelled) setSteps(n);
          } catch {
            // fall through to live watch only
          }
        }

        sub = Pedometer.watchStepCount((res: { steps: number }) => {
          const delta = Number(res?.steps) || 0;
          setSteps(baseRef.current + delta);
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
