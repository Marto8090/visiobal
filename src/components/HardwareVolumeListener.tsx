import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { VolumeManager } from 'react-native-volume-manager';

import { usePlayerState } from '../context/PlayerContext';
import { useBluetoothSession } from '../hooks/useBluetoothSession';

const VOLUME_COMMAND_DELAY_MS = 120;

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

    void VolumeManager.showNativeVolumeUI({ enabled: false }).catch(() => {});

    const subscription = VolumeManager.addVolumeListener(({ type, volume }) => {
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
      void VolumeManager.showNativeVolumeUI({ enabled: true }).catch(() => {});
    };
  }, [sendCommandToBall, setVolume]);

  return null;
}
