// High-level BLE scale service. UI / hooks depend only on this.
//
// Picks the real adapter when react-native-ble-plx is available (dev-client
// build), otherwise transparently falls back to the mock adapter so Expo Go
// and tests keep working.

import type { BleAdapter, BleDevice, ScaleReading } from './types';
import { createMockAdapter } from './mockAdapter';
import { createRealAdapter, isRealBleAvailable } from './realAdapter';

let adapter: BleAdapter | null = null;

function getAdapter(): BleAdapter {
  if (!adapter) {
    adapter = isRealBleAvailable() ? createRealAdapter() : createMockAdapter();
  }
  return adapter;
}

/** Test/storybook hook — override the adapter in tests. */
export function __setAdapterForTests(a: BleAdapter | null) {
  adapter = a;
}

export function isUsingRealBle(): boolean {
  return getAdapter().isReal();
}

export async function scanForScale(timeoutMs?: number): Promise<BleDevice> {
  return getAdapter().scan(timeoutMs);
}

export async function connectScale(device: BleDevice): Promise<void> {
  return getAdapter().connect(device);
}

export function subscribeToWeight(
  listener: (reading: ScaleReading) => void,
): () => void {
  return getAdapter().subscribe(listener);
}

export async function disconnectScale(): Promise<void> {
  return getAdapter().disconnect();
}
