import { PermissionsAndroid, Platform } from 'react-native';
import type {
  BleManager as BleManagerType,
  Characteristic,
  Device,
  Service,
  Subscription,
} from 'react-native-ble-plx';

import { BallDevice } from '../types/bluetooth';

const SCAN_DURATION_MS = 8000;
const DISCONNECT_TIMEOUT_MS = 5000;
const ADVERTISING_RECOVERY_MS = 1500;
export const TARGET_BLE_DEVICE_NAME = 'VisioBal';
export const COMMAND_SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
export const COMMAND_CHARACTERISTIC_UUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';
type BleRuntime = typeof import('react-native-ble-plx');
export type BluetoothSessionSnapshot = {
  connectedDevice: BallDevice | null;
  isConnected: boolean;
  canSendCommands: boolean;
};

type ScanCandidate = {
  device: BallDevice;
  rank: number;
};

let bleRuntime: BleRuntime | null = null;
let bleManager: BleManagerType | null = null;
let connectedDevice: Device | null = null;
let lastKnownDeviceId: string | null = null;
let lastDisconnectAt = 0;
const verifiedDeviceIds = new Set<string>();
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

  if (nextDevice && hasExactTargetName(nextDevice)) {
    lastKnownDeviceId = nextDevice.id;
  }

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isOperationCancelledError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.toLowerCase().includes('cancel');
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

function getLocalName(device: Device): string | null {
  const localName = device.localName?.trim();
  return localName ? localName : null;
}

function getDeviceName(device: Device): string | null {
  const name = device.name?.trim();
  return name ? name : null;
}

function hasExactTargetName(device: Device): boolean {
  return (
    getLocalName(device) === TARGET_BLE_DEVICE_NAME || getDeviceName(device) === TARGET_BLE_DEVICE_NAME
  );
}

function normalizeUuid(uuid: string): string {
  return uuid.toLowerCase();
}

function getScanMatchRank(device: Device): number {
  if (verifiedDeviceIds.has(device.id) || device.id === lastKnownDeviceId) {
    return 4;
  }

  if (getLocalName(device) === TARGET_BLE_DEVICE_NAME) {
    return 3;
  }

  if (getDeviceName(device) === TARGET_BLE_DEVICE_NAME) {
    return 2;
  }

  return 0;
}

function toBallDevice(device: Device): BallDevice {
  return {
    id: device.id,
    name: getAdvertisedName(device) ?? TARGET_BLE_DEVICE_NAME,
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

function toCachedBallDevice(deviceId: string): BallDevice {
  return {
    id: deviceId,
    name: TARGET_BLE_DEVICE_NAME,
    localName: TARGET_BLE_DEVICE_NAME,
    rssi: null,
  };
}

async function resolveCommandTarget(device: Device): Promise<{
  characteristic: Characteristic;
  refreshedDevice: Device;
  service: Service;
}> {
  const refreshedDevice = await device.discoverAllServicesAndCharacteristics();
  const services = await refreshedDevice.services();
  const service = services.find(
    (candidate) => normalizeUuid(candidate.uuid) === normalizeUuid(COMMAND_SERVICE_UUID)
  );

  if (!service) {
    const availableServices = services.map((candidate) => candidate.uuid).join(', ') || 'none';
    throw new Error(
      `Command service not found on device. Expected ${COMMAND_SERVICE_UUID}. Found: ${availableServices}.`
    );
  }

  const characteristics = await service.characteristics();
  const characteristic = characteristics.find(
    (candidate) => normalizeUuid(candidate.uuid) === normalizeUuid(COMMAND_CHARACTERISTIC_UUID)
  );

  if (!characteristic) {
    const availableCharacteristics =
      characteristics.map((candidate) => candidate.uuid).join(', ') || 'none';
    throw new Error(
      `Command characteristic not found on service ${service.uuid}. Expected ${COMMAND_CHARACTERISTIC_UUID}. Found: ${availableCharacteristics}.`
    );
  }

  return {
    characteristic,
    refreshedDevice,
    service,
  };
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

async function waitForDeviceDisconnected(deviceId: string): Promise<void> {
  const deadline = Date.now() + DISCONNECT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const stillConnected = await getBleManager().isDeviceConnected(deviceId);

    if (!stillConnected) {
      return;
    }

    await delay(250);
  }

  throw new Error(
    'Bluetooth disconnect did not complete. The ESP32 may still be connected, so it will not advertise again yet.'
  );
}

async function forceDisconnectIfLingering(deviceId: string): Promise<void> {
  const manager = getBleManager();
  const isStillConnected = await manager.isDeviceConnected(deviceId);

  if (!isStillConnected) {
    return;
  }

  await manager.cancelDeviceConnection(deviceId);
  await waitForDeviceDisconnected(deviceId);
  lastDisconnectAt = Date.now();
}

async function connectFresh(deviceId: string): Promise<Device> {
  return getBleManager().connectToDevice(deviceId, {
    timeout: 10000,
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

  if (lastKnownDeviceId) {
    try {
      await forceDisconnectIfLingering(lastKnownDeviceId);
    } catch {
      // Keep scanning and fall back to the cached device entry below.
    }
  }

  const timeSinceDisconnect = Date.now() - lastDisconnectAt;
  if (lastDisconnectAt > 0 && timeSinceDisconnect < ADVERTISING_RECOVERY_MS) {
    await delay(ADVERTISING_RECOVERY_MS - timeSinceDisconnect);
  }

  const ble = getBleRuntime();
  const manager = getBleManager();
  const candidates = new Map<string, ScanCandidate>();

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

      const rankedCandidates = [...candidates.values()];
      const highestRank = rankedCandidates.reduce(
        (bestRank, candidate) => Math.max(bestRank, candidate.rank),
        0
      );
      const visibleDevices = rankedCandidates
        .filter((candidate) => candidate.rank === highestRank)
        .map((candidate) => candidate.device);

      if (
        visibleDevices.length === 0 &&
        lastKnownDeviceId &&
        verifiedDeviceIds.has(lastKnownDeviceId)
      ) {
        resolve([toCachedBallDevice(lastKnownDeviceId)]);
        return;
      }

      resolve(sortBySignalStrength(visibleDevices));
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

          if (!scannedDevice) {
            return;
          }

          const rank = getScanMatchRank(scannedDevice);

          if (rank === 0) {
            return;
          }

          candidates.set(scannedDevice.id, {
            device: toBallDevice(scannedDevice),
            rank,
          });
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

  let nextConnectedDevice: Device;

  try {
    const isConnected = await manager.isDeviceConnected(device.id);

    if (isConnected) {
      await forceDisconnectIfLingering(device.id);
      await delay(ADVERTISING_RECOVERY_MS);
    }

    nextConnectedDevice = await connectFresh(device.id);
  } catch (error) {
    if (!isOperationCancelledError(error)) {
      throw error;
    }

    await forceDisconnectIfLingering(device.id).catch(() => {});
    await delay(ADVERTISING_RECOVERY_MS);
    nextConnectedDevice = await connectFresh(device.id);
  }

  const { refreshedDevice } = await resolveCommandTarget(nextConnectedDevice);

  if (!hasExactTargetName(refreshedDevice) && device.name !== TARGET_BLE_DEVICE_NAME) {
    throw new Error(
      `Connected device name does not match ${TARGET_BLE_DEVICE_NAME}. Found ${getAdvertisedName(refreshedDevice) ?? device.name}.`
    );
  }

  verifiedDeviceIds.add(refreshedDevice.id);
  lastKnownDeviceId = refreshedDevice.id;
  setConnectedDevice(refreshedDevice);
  return true;
}

export async function disconnectFromBall(): Promise<void> {
  if (!connectedDevice) {
    return;
  }

  const deviceToDisconnect = connectedDevice;

  await getBleManager().cancelDeviceConnection(deviceToDisconnect.id);
  await waitForDeviceDisconnected(deviceToDisconnect.id);
  setConnectedDevice(null);
  lastDisconnectAt = Date.now();
  await delay(ADVERTISING_RECOVERY_MS);
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

  const { characteristic, refreshedDevice } = await resolveCommandTarget(connectedDevice);
  setConnectedDevice(refreshedDevice);
  const payload = encodeCommandPayload(command);

  if (characteristic.isWritableWithResponse) {
    await characteristic.writeWithResponse(payload);
    return;
  }

  if (characteristic.isWritableWithoutResponse) {
    await characteristic.writeWithoutResponse(payload);
    return;
  }

  // Some BLE stacks report write flags unreliably, so try the service-based calls as a fallback.
  try {
    await refreshedDevice.writeCharacteristicWithResponseForService(
      COMMAND_SERVICE_UUID,
      COMMAND_CHARACTERISTIC_UUID,
      payload
    );
    return;
  } catch {
    await refreshedDevice.writeCharacteristicWithoutResponseForService(
      COMMAND_SERVICE_UUID,
      COMMAND_CHARACTERISTIC_UUID,
      payload
    );
  }
}
