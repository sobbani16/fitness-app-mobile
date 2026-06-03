// Real BLE adapter using react-native-ble-plx.
//
// IMPORTANT: react-native-ble-plx requires native code and CANNOT run in
// Expo Go. To enable it, build a dev-client:
//   npx expo install react-native-ble-plx
//   npx expo prebuild && npx expo run:ios   (or run:android)
//
// Until then, `isAvailable()` returns false and `bleService` picks the mock
// adapter automatically. That keeps Expo Go working out of the box.

import type { BleAdapter, BleDevice, ScaleReading } from './types';
import { parseWeight } from './parseWeight';

// Standard GATT Weight Scale service + measurement characteristic UUIDs.
// Replace with your specific scale's UUIDs if it uses vendor-specific ones.
const WEIGHT_SERVICE_UUID = '0000181d-0000-1000-8000-00805f9b34fb';
const WEIGHT_MEASUREMENT_UUID = '00002a9d-0000-1000-8000-00805f9b34fb';
const SCAN_TIMEOUT_MS = 8000;

// Lazy, guarded import: the module simply won't resolve in Expo Go.
// We hide it behind a function so static analysis doesn't pull it in.
function tryLoadBlePlx(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-ble-plx');
  } catch {
    return null;
  }
}

export function isRealBleAvailable(): boolean {
  return tryLoadBlePlx() !== null;
}

export function createRealAdapter(): BleAdapter {
  const mod = tryLoadBlePlx();
  if (!mod) {
    throw new Error(
      'react-native-ble-plx is not installed. Install it and build a dev-client to use a real BLE scale.',
    );
  }
  const { BleManager } = mod;
  const manager = new BleManager();

  let connectedDeviceId: string | null = null;
  let characteristicSubscription: { remove: () => void } | null = null;
  const listeners = new Set<(r: ScaleReading) => void>();

  return {
    isReal() { return true; },

    scan(timeoutMs = SCAN_TIMEOUT_MS) {
      return new Promise<BleDevice>((resolve, reject) => {
        const timeout = setTimeout(() => {
          manager.stopDeviceScan();
          reject(new Error('No scale found'));
        }, timeoutMs);

        manager.startDeviceScan(
          [WEIGHT_SERVICE_UUID],
          null,
          (error: any, device: any) => {
            if (error) {
              clearTimeout(timeout);
              manager.stopDeviceScan();
              reject(error);
              return;
            }
            if (device) {
              clearTimeout(timeout);
              manager.stopDeviceScan();
              resolve({ id: device.id, name: device.name ?? null });
            }
          },
        );
      });
    },

    async connect(device: BleDevice) {
      const dev = await manager.connectToDevice(device.id);
      await dev.discoverAllServicesAndCharacteristics();
      connectedDeviceId = dev.id;
    },

    subscribe(listener) {
      listeners.add(listener);
      if (!characteristicSubscription && connectedDeviceId) {
        characteristicSubscription = manager.monitorCharacteristicForDevice(
          connectedDeviceId,
          WEIGHT_SERVICE_UUID,
          WEIGHT_MEASUREMENT_UUID,
          (_err: any, char: any) => {
            if (!char?.value) return;
            // base64 → byte array
            const bytes = base64ToBytes(char.value);
            const parsed = parseWeight(bytes);
            if (!parsed) return; // ignore invalid readings
            const reading: ScaleReading = {
              ...parsed,
              timestamp: new Date().toISOString(),
            };
            listeners.forEach((l) => l(reading));
          },
        );
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && characteristicSubscription) {
          characteristicSubscription.remove();
          characteristicSubscription = null;
        }
      };
    },

    async disconnect() {
      if (characteristicSubscription) {
        characteristicSubscription.remove();
        characteristicSubscription = null;
      }
      if (connectedDeviceId) {
        await manager.cancelDeviceConnection(connectedDeviceId).catch(() => {});
        connectedDeviceId = null;
      }
      listeners.clear();
    },
  };
}

function base64ToBytes(b64: string): number[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Buffer } = require('buffer');
  return Array.from(Buffer.from(b64, 'base64'));
}
