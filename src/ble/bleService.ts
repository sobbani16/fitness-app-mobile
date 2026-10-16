// High-level BLE scale service. UI / hooks depend only on this.
//
// Uses the native BLE adapter. Unsupported builds report unavailable;
// synthetic readings are only available through explicit test injection.

import type { BleAdapter, BleDevice, ScaleReading } from './types';

import { createRealAdapter, isRealBleAvailable } from './realAdapter';

let adapter: BleAdapter | null = null;

function getAdapter(): BleAdapter {
  if (!adapter) {
    adapter = createRealAdapter();
  }
  return adapter;
}

/** Test/storybook hook — override the adapter in tests. */
export function __setAdapterForTests(a: BleAdapter | null) {
  adapter = a;
}

export function isUsingRealBle(): boolean {
  return isRealBleAvailable();
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
