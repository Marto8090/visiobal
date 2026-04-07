import { PermissionsAndroid, Platform } from 'react-native';
import type { BleManager as BleManagerType, Device, Subscription } from 'react-native-ble-plx';

import { BallDevice } from '../types/bluetooth';

const SCAN_DURATION_MS = 8000;
export const TARGET_BLE_DEVICE_NAME = 'ESP32_BLE_Prototype - Clon';
// Replace these with the UUIDs exposed by the ESP32 GATT service you want to write commands to.
export const COMMAND_SERVICE_UUID: string | null = null;
export const COMMAND_CHARACTERISTIC_UUID: string | null = null;
type BleRuntime = typeof import('react-native-ble-plx');
export type BluetoothSessionSnapshot = {
  connectedDevice: BallDevice | null;
  isConnected: boolean;
  canSendCommands: boolean;
};

let bleRuntime: BleRuntime | null = null;
let bleManager: BleManagerType | null = null;
let connectedDevice: Device | null = null;
let disconnectSubscription: Subscription | null = null;
const sessionListeners = new Set<() => void>();
let sessionSnapshot: BluetoothSessionSnapshot = {
  connectedDevice: null,
  isConnected: false,
  canSendCommands: Boolean(COMMAND_SERVICE_UUID && COMMAND_CHARACTERISTIC_UUID),
};

function updateSessionSnapshot() {
  sessionSnapshot = {
    connectedDevice: connectedDevice ? toBallDevice(connectedDevice) : null,
    isConnected: connectedDevice !== null,
    canSendCommands: Boolean(COMMAND_SERVICE_UUID && COMMAND_CHARACTERISTIC_UUID),
  };
}

function emitSessionChange() {
  sessionListeners.forEach((listener) => listener());
}

function clearDisconnectSubscription() {
  disconnectSubscription?.remove();
  disconnectSubscription = null;
}

function setConnectedDevice(nextDevice: Device | null) {
  connectedDevice = nextDevice;
  updateSessionSnapshot();

  clearDisconnectSubscription();

  if (nextDevice) {
    disconnectSubscription = getBleManager().onDeviceDisconnected(nextDevice.id, () => {
      setConnectedDevice(null);
    });
  }

  emitSessionChange();
}

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const chunk = (first << 16) | (second << 8) | third;

    result += alphabet[(chunk >> 18) & 63];
    result += alphabet[(chunk >> 12) & 63];
    result += index + 1 < bytes.length ? alphabet[(chunk >> 6) & 63] : '=';
    result += index + 2 < bytes.length ? alphabet[chunk & 63] : '=';
  }

  return result;
}

function encodeCommandPayload(command: string): string {
  if (typeof TextEncoder !== 'undefined') {
    return bytesToBase64(new TextEncoder().encode(command));
  }

  return bytesToBase64(Uint8Array.from(command.split('').map((char) => char.charCodeAt(0) & 0xff)));
}

function getBleRuntime(): BleRuntime {
  if (Platform.OS === 'web') {
    throw new Error('Bluetooth scanning is only available on Android or iPhone.');
  }

  if (bleRuntime) {
    return bleRuntime;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Load lazily so unsupported builds do not crash on import.
    bleRuntime = require('react-native-ble-plx') as BleRuntime;
    return bleRuntime;
  } catch {
    throw new Error(
      'Bluetooth support could not be loaded. Build and open a native development build first.'
    );
  }
}

function getBleManager(): BleManagerType {
  if (bleManager) {
    return bleManager;
  }

  const ble = getBleRuntime();

  try {
    bleManager = new ble.BleManager();
    return bleManager;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (message.includes('createClient')) {
      throw new Error(
        'Bluetooth native support is missing. Use a development build, not Expo Go, and rebuild the app with npx expo run:android.'
      );
    }

    throw new Error(
      'Bluetooth could not start on this build. Rebuild the native app and try again.'
    );
  }
}

function getAdvertisedName(device: Device): string | null {
  const name = device.localName?.trim() || device.name?.trim();
  return name ? name : null;
}

function isTestableDevice(device: Device): boolean {
  return getAdvertisedName(device) === TARGET_BLE_DEVICE_NAME;
}

function toBallDevice(device: Device): BallDevice {
  return {
    id: device.id,
    name: getAdvertisedName(device) ?? 'Unnamed BLE device',
    localName: device.localName,
    rssi: device.rssi,
  };
}

function sortBySignalStrength(devices: BallDevice[]): BallDevice[] {
  return [...devices].sort((left, right) => {
    const leftRssi = left.rssi ?? -999;
    const rightRssi = right.rssi ?? -999;

    return rightRssi - leftRssi;
  });
}

export function getBluetoothSessionSnapshot(): BluetoothSessionSnapshot {
  return sessionSnapshot;
}

export function subscribeToBluetoothSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

async function requestBluetoothPermissions(): Promise<void> {
  getBleRuntime();

  if (Platform.OS !== 'android') {
    return;
  }

  const androidVersion =
    typeof Platform.Version === 'string' ? Number.parseInt(Platform.Version, 10) : Platform.Version;

  const permissions =
    androidVersion >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const result = await PermissionsAndroid.requestMultiple(permissions);
  const allGranted = permissions.every(
    (permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED
  );

  if (!allGranted) {
    throw new Error('Bluetooth permissions were denied.');
  }
}

async function ensureBluetoothReady(): Promise<void> {
  const ble = getBleRuntime();
  const manager = getBleManager();
  const currentState = await manager.state();

  if (currentState === ble.State.PoweredOn) {
    return;
  }

  if (currentState === ble.State.PoweredOff) {
    throw new Error('Bluetooth is turned off. Turn it on and scan again.');
  }

  await new Promise<void>((resolve, reject) => {
    let subscription: Subscription | null = null;

    const timeoutId = setTimeout(() => {
      subscription?.remove();
      reject(new Error('Bluetooth is off. Turn it on and try again.'));
    }, 10000);

    subscription = manager.onStateChange((nextState) => {
      if (nextState === ble.State.PoweredOn) {
        clearTimeout(timeoutId);
        subscription?.remove();
        resolve();
        return;
      }

      if (nextState === ble.State.Unsupported) {
        clearTimeout(timeoutId);
        subscription?.remove();
        reject(new Error('This device does not support Bluetooth Low Energy.'));
        return;
      }

      if (nextState === ble.State.Unauthorized) {
        clearTimeout(timeoutId);
        subscription?.remove();
        reject(new Error('Bluetooth access is not authorized on this device.'));
      }
    }, true);
  });
}

export async function stopScanning(): Promise<void> {
  if (!bleManager) {
    return;
  }

  try {
    await bleManager.stopDeviceScan();
  } catch {
    // Ignore stop errors when no scan is active.
  }
}

export async function scanForVisioballs(): Promise<BallDevice[]> {
  await requestBluetoothPermissions();
  await ensureBluetoothReady();

  const ble = getBleRuntime();
  const manager = getBleManager();
  const devices = new Map<string, BallDevice>();

  return new Promise<BallDevice[]>((resolve, reject) => {
    let settled = false;

    const finish = async (error?: unknown) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutId);
      await stopScanning();

      if (error) {
        reject(error);
        return;
      }

      resolve(sortBySignalStrength([...devices.values()]));
    };

    const timeoutId = setTimeout(() => {
      void finish();
    }, SCAN_DURATION_MS);

    manager
      .startDeviceScan(
        null,
        {
          allowDuplicates: false,
          scanMode: Platform.OS === 'android' ? ble.ScanMode.LowLatency : undefined,
        },
        (error, scannedDevice) => {
          if (error) {
            void finish(new Error(error.reason ?? 'Bluetooth scan failed.'));
            return;
          }

          if (!scannedDevice || !isTestableDevice(scannedDevice)) {
            return;
          }

          devices.set(scannedDevice.id, toBallDevice(scannedDevice));
        }
      )
      .catch((error) => {
        void finish(error);
      });
  });
}

export async function connectToBall(device: BallDevice): Promise<boolean> {
  await requestBluetoothPermissions();
  await ensureBluetoothReady();
  await stopScanning();

  const manager = getBleManager();
  const isCurrentDevice = connectedDevice?.id === device.id;
  if (isCurrentDevice) {
    return true;
  }

  if (connectedDevice && connectedDevice.id !== device.id) {
    await disconnectFromBall();
  }

  const isConnected = await manager.isDeviceConnected(device.id);
  let nextConnectedDevice: Device;

  if (isConnected) {
    const [existingDevice] = await manager.devices([device.id]);

    if (!existingDevice) {
      throw new Error('The device is connected but could not be resolved.');
    }

    nextConnectedDevice = existingDevice;
  } else {
    nextConnectedDevice = await manager.connectToDevice(device.id, {
      timeout: 10000,
    });
  }

  await nextConnectedDevice.discoverAllServicesAndCharacteristics();
  setConnectedDevice(nextConnectedDevice);
  return true;
}

export async function disconnectFromBall(): Promise<void> {
  if (!connectedDevice) {
    return;
  }

  const deviceToDisconnect = connectedDevice;

  try {
    await getBleManager().cancelDeviceConnection(deviceToDisconnect.id);
  } finally {
    if (connectedDevice?.id === deviceToDisconnect.id) {
      setConnectedDevice(null);
    }
  }
}

export async function sendCommandToBall(command: string): Promise<void> {
  await requestBluetoothPermissions();
  await ensureBluetoothReady();

  if (!connectedDevice) {
    throw new Error('No ball is connected.');
  }

  if (!COMMAND_SERVICE_UUID || !COMMAND_CHARACTERISTIC_UUID) {
    throw new Error(
      'Command UUIDs are not configured. Set COMMAND_SERVICE_UUID and COMMAND_CHARACTERISTIC_UUID in bluetoothService.ts.'
    );
  }

  await connectedDevice.writeCharacteristicWithResponseForService(
    COMMAND_SERVICE_UUID,
    COMMAND_CHARACTERISTIC_UUID,
    encodeCommandPayload(command)
  );
}


