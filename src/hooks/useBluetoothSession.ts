import { useSyncExternalStore } from 'react';

import {
  connectToBall,
  disconnectFromBall,
  getBluetoothSessionSnapshot,
  sendCommandToBall,
  subscribeToBluetoothSession,
} from '../services/bluetoothService';

export function useBluetoothSession() {
  const session = useSyncExternalStore(
    subscribeToBluetoothSession,
    getBluetoothSessionSnapshot,
    getBluetoothSessionSnapshot
  );

  return {
    ...session,
    connectToBall,
    disconnectFromBall,
    sendCommandToBall,
  };
}
