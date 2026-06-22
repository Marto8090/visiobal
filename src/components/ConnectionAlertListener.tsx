import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAppSettings } from '../context/AppSettingsContext';
import { useI18n } from '../context/I18nContext';
import { useBluetoothSession } from '../hooks/useBluetoothSession';

const CONNECTION_ALERT_CHANNEL_ID = 'connection-alerts';
const BATTERY_WARNING_CHANNEL_ID = 'battery-warnings';
const LOW_BATTERY_THRESHOLD = 20;
const LOW_BATTERY_RESET_THRESHOLD = 25;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureNotificationPermission(channelId: string, channelName: string): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(channelId, {
      importance: Notifications.AndroidImportance.DEFAULT,
      name: channelName,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export function ConnectionAlertListener() {
  const { batteryWarnings, connectionAlerts, pushNotifications } = useAppSettings();
  const { batteryIsCharging, batteryLevel, connectedDevice, isConnected } = useBluetoothSession();
  const { t } = useI18n();
  const previousConnectedRef = useRef<boolean | null>(null);
  const lowBatteryNotifiedRef = useRef(false);

  useEffect(() => {
    if (!pushNotifications) return;

    if (connectionAlerts) {
      void ensureNotificationPermission(CONNECTION_ALERT_CHANNEL_ID, 'Connection alerts').catch(() => {});
    }

    if (batteryWarnings) {
      void ensureNotificationPermission(BATTERY_WARNING_CHANNEL_ID, 'Battery warnings').catch(() => {});
    }
  }, [batteryWarnings, connectionAlerts, pushNotifications]);

  useEffect(() => {
    const connected = isConnected && Boolean(connectedDevice);

    if (previousConnectedRef.current === null) {
      previousConnectedRef.current = connected;
      return;
    }

    if (previousConnectedRef.current === connected) return;
    previousConnectedRef.current = connected;

    if (!connectionAlerts || !pushNotifications || connected) return;

    void ensureNotificationPermission(CONNECTION_ALERT_CHANNEL_ID, 'Connection alerts')
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

  useEffect(() => {
    const connected = isConnected && Boolean(connectedDevice);

    if (
      !batteryWarnings ||
      !pushNotifications ||
      !connected ||
      batteryLevel === null ||
      batteryIsCharging === true
    ) {
      if (!connected || batteryIsCharging === true || !batteryWarnings || !pushNotifications) {
        lowBatteryNotifiedRef.current = false;
      }
      return;
    }

    if (batteryLevel > LOW_BATTERY_RESET_THRESHOLD) {
      lowBatteryNotifiedRef.current = false;
      return;
    }

    if (batteryLevel > LOW_BATTERY_THRESHOLD || lowBatteryNotifiedRef.current) return;

    lowBatteryNotifiedRef.current = true;

    void ensureNotificationPermission(BATTERY_WARNING_CHANNEL_ID, 'Battery warnings')
      .then((hasPermission) => {
        if (!hasPermission) return;
        return Notifications.scheduleNotificationAsync({
          content: {
            body: t('lowBatteryBody').replace('{level}', String(batteryLevel)),
            title: t('lowBatteryTitle'),
          },
          trigger: Platform.OS === 'android' ? { channelId: BATTERY_WARNING_CHANNEL_ID } : null,
        });
      })
      .catch(() => {
        lowBatteryNotifiedRef.current = false;
      });
  }, [batteryIsCharging, batteryLevel, batteryWarnings, connectedDevice, isConnected, pushNotifications, t]);

  return null;
}
