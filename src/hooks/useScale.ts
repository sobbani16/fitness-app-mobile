import { useCallback, useEffect, useRef, useState } from 'react';
import * as ble from '../ble/bleService';
import type { ScaleReading, ScaleStatus } from '../ble/types';

export interface UseScale {
  status: ScaleStatus;
  reading: ScaleReading | null;      // latest reading (may be unstable)
  stableGrams: number | null;        // set once a stable reading arrives
  error: string | null;
  isMock: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reset: () => void;
}

/**
 * Manages the lifecycle of a BLE scale connection.
 *
 * Behavior:
 *   - `connect()` scans → connects → subscribes in one call
 *   - `reading` updates as the scale emits values
 *   - `stableGrams` is set when the adapter reports a stable reading
 *   - errors surface on `error` with `status === 'error'` so the UI can
 *     offer a Retry action
 */
export function useScale(): UseScale {
  const [status, setStatus] = useState<ScaleStatus>('idle');
  const [reading, setReading] = useState<ScaleReading | null>(null);
  const [stableGrams, setStableGrams] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<null | (() => void)>(null);

  // Tear down subscription + connection on unmount.
  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
      ble.disconnectScale().catch(() => {});
    };
  }, []);

  const reset = useCallback(() => {
    setReading(null);
    setStableGrams(null);
    setError(null);
    setStatus('idle');
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setReading(null);
    setStableGrams(null);

    try {
      setStatus('scanning');
      const device = await ble.scanForScale();
      setStatus('connecting');
      await ble.connectScale(device);
      setStatus('connected');

      if (unsubRef.current) unsubRef.current();
      unsubRef.current = ble.subscribeToWeight((r) => {
        setReading(r);
        // Lock in the first stable reading we see.
        if (r.stable) setStableGrams((prev) => prev ?? r.grams);
      });
    } catch (e: any) {
      setError(e?.message || 'Could not connect to scale');
      setStatus('error');
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    await ble.disconnectScale().catch(() => {});
    setStatus('idle');
  }, []);

  return {
    status,
    reading,
    stableGrams,
    error,
    isMock: !ble.isUsingRealBle(),
    connect,
    disconnect,
    reset,
  };
}
