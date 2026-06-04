import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { STORAGE_KEYS } from '../utils/storage';

const DEFAULT_SETTINGS = {
  batteryWarnings: false,
  connectionAlerts: false,
  pushNotifications: false,
};

type AppSettingsContextType = {
  batteryWarnings: boolean;
  connectionAlerts: boolean;
  pushNotifications: boolean;
  resetNotificationSettings: () => void;
  setBatteryWarnings: (value: boolean) => void;
  setConnectionAlerts: (value: boolean) => void;
  setPushNotifications: (value: boolean) => void;
};

const AppSettingsContext = createContext<AppSettingsContextType>({
  ...DEFAULT_SETTINGS,
  resetNotificationSettings: () => {},
  setBatteryWarnings: () => {},
  setConnectionAlerts: () => {},
  setPushNotifications: () => {},
});

async function readStoredBoolean(key: string, fallback: boolean): Promise<boolean> {
  const stored = await AsyncStorage.getItem(key);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return fallback;
}

function persistBoolean(key: string, value: boolean) {
  void AsyncStorage.setItem(key, value ? 'true' : 'false');
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [pushNotifications, setPushNotificationsState] = useState(DEFAULT_SETTINGS.pushNotifications);
  const [connectionAlerts, setConnectionAlertsState] = useState(DEFAULT_SETTINGS.connectionAlerts);
  const [batteryWarnings, setBatteryWarningsState] = useState(DEFAULT_SETTINGS.batteryWarnings);

  useEffect(() => {
    void Promise.all([
      readStoredBoolean(STORAGE_KEYS.PUSH_NOTIFICATIONS, DEFAULT_SETTINGS.pushNotifications),
      readStoredBoolean(STORAGE_KEYS.CONNECTION_ALERTS, DEFAULT_SETTINGS.connectionAlerts),
      readStoredBoolean(STORAGE_KEYS.BATTERY_WARNINGS, DEFAULT_SETTINGS.batteryWarnings),
    ]).then(([storedPushNotifications, storedConnectionAlerts, storedBatteryWarnings]) => {
      setPushNotificationsState(storedPushNotifications);
      setConnectionAlertsState(storedConnectionAlerts);
      setBatteryWarningsState(storedBatteryWarnings);
    });
  }, []);

  const setPushNotifications = (value: boolean) => {
    setPushNotificationsState(value);
    persistBoolean(STORAGE_KEYS.PUSH_NOTIFICATIONS, value);
  };

  const setConnectionAlerts = (value: boolean) => {
    setConnectionAlertsState(value);
    persistBoolean(STORAGE_KEYS.CONNECTION_ALERTS, value);
  };

  const setBatteryWarnings = (value: boolean) => {
    setBatteryWarningsState(value);
    persistBoolean(STORAGE_KEYS.BATTERY_WARNINGS, value);
  };

  const resetNotificationSettings = () => {
    setPushNotifications(DEFAULT_SETTINGS.pushNotifications);
    setConnectionAlerts(DEFAULT_SETTINGS.connectionAlerts);
    setBatteryWarnings(DEFAULT_SETTINGS.batteryWarnings);
  };

  return (
    <AppSettingsContext.Provider
      value={{
        batteryWarnings,
        connectionAlerts,
        pushNotifications,
        resetNotificationSettings,
        setBatteryWarnings,
        setConnectionAlerts,
        setPushNotifications,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export const useAppSettings = () => useContext(AppSettingsContext);
