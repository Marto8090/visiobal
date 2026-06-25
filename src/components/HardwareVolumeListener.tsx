import { useEffect, useRef } from 'react';
import { NativeModules, Platform } from 'react-native';

import { usePlayerState } from '../context/PlayerContext';
import { useBluetoothSession } from '../hooks/useBluetoothSession';

const VOLUME_COMMAND_DELAY_MS = 120;

type VolumeListenerHandle = { remove: () => void };
type VolumeManagerLike = {
  showNativeVolumeUI: (config: { enabled: boolean }) => Promise<void>;
  addVolumeListener: (
    cb: (event: { type?: string; volume: number }) => void
  ) => VolumeListenerHandle;
};

/**
 * react-native-volume-manager has a native side. If the app binary was built
 * before the package was added, the package throws at *import time* (it builds a
 * NativeEventEmitter at module load). Importing it would then crash the whole
 * router. So we only load it when its native module is actually present in this
 * build; otherwise this listener is a harmless no-op until the app is rebuilt.
 */
function loadVolumeManager(): VolumeManagerLike | null {
  if (!NativeModules.VolumeManager) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy so a missing native module can't crash import.
    return require('react-native-volume-manager').VolumeManager as VolumeManagerLike;
  } catch {
    return null;
  }
}

function toVolumePercent(value: number): number {
  return Math.round(Math.min(Math.max(value, 0), 1) * 100);
}

export function HardwareVolumeListener() {
  const { setVolume } = usePlayerState();
  const { canSendCommands, isConnected, sendCommandToBall } = useBluetoothSession();
  const canSendRef = useRef(false);
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    canSendRef.current = isConnected && canSendCommands;
  }, [canSendCommands, isConnected]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const volumeManager = loadVolumeManager();
    if (!volumeManager) {
      // Native module not linked into this build — rebuild with `npx expo run:android`.
      return;
    }

    void volumeManager.showNativeVolumeUI({ enabled: false }).catch(() => {});

    const subscription = volumeManager.addVolumeListener(({ type, volume }) => {
      if (type && type !== 'music') return;

      const nextVolume = toVolumePercent(volume);
      setVolume(nextVolume);

      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
      }

      if (!canSendRef.current) return;

      sendTimeoutRef.current = setTimeout(() => {
        sendTimeoutRef.current = null;
        if (!canSendRef.current) return;
        void sendCommandToBall(`VOL:${nextVolume}`).catch(() => {});
      }, VOLUME_COMMAND_DELAY_MS);
    });

    return () => {
      subscription.remove();
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = null;
      }
      void volumeManager.showNativeVolumeUI({ enabled: true }).catch(() => {});
    };
  }, [sendCommandToBall, setVolume]);

  return null;
}
