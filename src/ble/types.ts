// Public types for the BLE scale subsystem.
// UI / hooks should depend only on these — never on a concrete adapter.

export type ScaleStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'error';

export interface ScaleReading {
  grams: number;
  stable: boolean;     // true if scale reports a stable value
  timestamp: string;   // ISO
}

export interface BleDevice {
  id: string;
  name: string | null;
}

export interface BleAdapter {
  /** Returns true when the adapter can actually talk to a real scale. */
  isReal(): boolean;

  /** Start scanning. Resolves once a compatible device is found. */
  scan(timeoutMs?: number): Promise<BleDevice>;

  /** Connect to a previously discovered device. */
  connect(device: BleDevice): Promise<void>;

  /**
   * Subscribe to weight notifications.
   * Adapter is responsible for parsing raw characteristic bytes into grams
   * via `parseWeight` before invoking the listener.
   * Returns an unsubscribe function.
   */
  subscribe(listener: (reading: ScaleReading) => void): () => void;

  /** Disconnect and clean up resources. */
  disconnect(): Promise<void>;
}
