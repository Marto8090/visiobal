import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { VolumeManager } from 'react-native-volume-manager';

import { usePlayerState } from '../context/PlayerContext';
import { useBluetoothSession } from '../hooks/useBluetoothSession';

const VOLUME_COMMAND_DELAY_MS = 120;
const HARDWARE_VOLUME_STEP = 5;
const NATIVE_VOLUME_CENTER = 0.5;
const NATIVE_VOLUME_RESET_DELAY_MS = 120;
const NATIVE_VOLUME_EPSILON = 0.01;

function clampAppVolume(value: number): number {
  return Math.min(Math.max(value, 0), 100);
}

export function HardwareVolumeListener() {
  const { volume, setVolume } = usePlayerState();
  const { canSendCommands, isConnected, sendCommandToBall } = useBluetoothSession();
  const canSendRef = useRef(false);
  const nativeVolumeRef = useRef<number | null>(null);
  const volumeRef = useRef(volume);
  const isResettingNativeVolumeRef = useRef(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    canSendRef.current = isConnected && canSendCommands;
  }, [canSendCommands, isConnected]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    void VolumeManager.showNativeVolumeUI({ enabled: false }).catch(() => {});
    void VolumeManager.getVolume()
      .then(({ volume: nativeVolume }) => {
        nativeVolumeRef.current = nativeVolume;
      })
      .catch(() => {});

    const queueVolumeCommand = (nextVolume: number) => {
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
      }

      if (!canSendRef.current) return;

      sendTimeoutRef.current = setTimeout(() => {
        sendTimeoutRef.current = null;
        if (!canSendRef.current) return;
        void sendCommandToBall(`VOL:${nextVolume}`).catch(() => {});
      }, VOLUME_COMMAND_DELAY_MS);
    };

    const resetNativeVolume = () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }

      isResettingNativeVolumeRef.current = true;
      nativeVolumeRef.current = NATIVE_VOLUME_CENTER;

      void VolumeManager.setVolume(NATIVE_VOLUME_CENTER, {
        playSound: false,
        showUI: false,
        type: 'music',
      })
        .catch(() => {})
        .finally(() => {
          resetTimeoutRef.current = setTimeout(() => {
            isResettingNativeVolumeRef.current = false;
            resetTimeoutRef.current = null;
          }, NATIVE_VOLUME_RESET_DELAY_MS);
        });
    };

    const subscription = VolumeManager.addVolumeListener(({ type, volume }) => {
      if (type && type !== 'music') return;

      if (isResettingNativeVolumeRef.current) {
        nativeVolumeRef.current = volume;
        return;
      }

      const previousNativeVolume = nativeVolumeRef.current;
      nativeVolumeRef.current = volume;

      if (previousNativeVolume === null) return;

      const nativeDelta = volume - previousNativeVolume;
      if (Math.abs(nativeDelta) < NATIVE_VOLUME_EPSILON) return;

      const direction = nativeDelta > 0 ? 1 : -1;
      const nextVolume = clampAppVolume(volumeRef.current + direction * HARDWARE_VOLUME_STEP);
      volumeRef.current = nextVolume;
      setVolume(nextVolume);
      queueVolumeCommand(nextVolume);
      resetNativeVolume();
    });

    resetNativeVolume();

    return () => {
      subscription.remove();
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = null;
      }
      void VolumeManager.showNativeVolumeUI({ enabled: true }).catch(() => {});
    };
  }, [sendCommandToBall, setVolume]);

  return null;
}
