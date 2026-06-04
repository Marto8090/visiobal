import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAppSettings } from '../context/AppSettingsContext';
import { useI18n } from '../context/I18nContext';
import { useBluetoothSession } from '../hooks/useBluetoothSession';

const CONNECTION_ALERT_CHANNEL_ID = 'connection-alerts';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CONNECTION_ALERT_CHANNEL_ID, {
      importance: Notifications.AndroidImportance.DEFAULT,
      name: 'Connection alerts',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export function ConnectionAlertListener() {
  const { connectionAlerts, pushNotifications } = useAppSettings();
  const { connectedDevice, isConnected } = useBluetoothSession();
  const { t } = useI18n();
  const previousConnectedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!connectionAlerts || !pushNotifications) return;
    void ensureNotificationPermission().catch(() => {});
  }, [connectionAlerts, pushNotifications]);

  useEffect(() => {
    const connected = isConnected && Boolean(connectedDevice);

    if (previousConnectedRef.current === null) {
      previousConnectedRef.current = connected;
      return;
    }

    if (previousConnectedRef.current === connected) return;
    previousConnectedRef.current = connected;

    if (!connectionAlerts || !pushNotifications || connected) return;

    void ensureNotificationPermission()
      .then((hasPermission) => {
        if (!hasPermission) return;
        return Notifications.scheduleNotificationAsync({
          content: {
            body: t('disconnected'),
            title: t('connectionAlerts'),
          },
          trigger: Platform.OS === 'android' ? { channelId: CONNECTION_ALERT_CHANNEL_ID } : null,
        });
      })
      .catch(() => {});
  }, [connectedDevice, connectionAlerts, isConnected, pushNotifications, t]);

  return null;
}
