import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

type ToggleRowProps = {
  label: string;
  onValueChange: (value: boolean) => void;
  subtitle: string;
  value: boolean;
};

type MenuRowProps = {
  danger?: boolean;
  hideChevron?: boolean;
  label: string;
  onPress?: () => void;
  subtitle?: string;
};

type StaticRowProps = {
  label: string;
  subtitle?: string;
};

const DEFAULT_SETTINGS = {
  batteryWarnings: true,
  connectionAlerts: false,
  pushNotifications: true,
};

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function ToggleRow({ label, onValueChange, subtitle, value }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        ios_backgroundColor="#161A2E"
        onValueChange={onValueChange}
        thumbColor="#FFFFFF"
        trackColor={{ false: '#161A2E', true: '#F472B6' }}
        value={value}
      />
    </View>
  );
}

function MenuRow({ danger = false, hideChevron = false, label, onPress, subtitle }: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, danger && styles.dangerRow, pressed && styles.pressed]}
    >
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {!hideChevron && <Ionicons color="#7A8CAE" name="chevron-forward" size={18} />}
    </Pressable>
  );
}

function StaticRow({ label, subtitle }: StaticRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const appVersion = '1.4.0';

  const [pushNotifications, setPushNotifications] = useState(DEFAULT_SETTINGS.pushNotifications);
  const [connectionAlerts, setConnectionAlerts] = useState(DEFAULT_SETTINGS.connectionAlerts);
  const [batteryWarnings, setBatteryWarnings] = useState(DEFAULT_SETTINGS.batteryWarnings);

  const resetToDefaults = () => {
    setPushNotifications(DEFAULT_SETTINGS.pushNotifications);
    setConnectionAlerts(DEFAULT_SETTINGS.connectionAlerts);
    setBatteryWarnings(DEFAULT_SETTINGS.batteryWarnings);

    Alert.alert('Factory reset complete', 'App preferences have been restored to default mode.');
  };

  const confirmFactoryReset = () => {
    Alert.alert(
      'Factory reset',
      'This will remove all preferences put in the app and return it to default mode.',
      [
        { style: 'cancel', text: 'Cancel' },
        { onPress: resetToDefaults, style: 'destructive', text: 'Reset' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons color="#F472B6" name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section title="NOTIFICATIONS">
          <ToggleRow
            label="Push notifications"
            onValueChange={setPushNotifications}
            subtitle="Alerts for ball events"
            value={pushNotifications}
          />
          <Separator />
          <ToggleRow
            label="Connection alerts"
            onValueChange={setConnectionAlerts}
            subtitle="Device connect / disconnect"
            value={connectionAlerts}
          />
          <Separator />
          <ToggleRow
            label="Battery warnings"
            onValueChange={setBatteryWarnings}
            subtitle="Low battery reminder"
            value={batteryWarnings}
          />
        </Section>

        <Section title="DEVICE">
          <StaticRow label="Device name" subtitle="VisioBall - Device A4" />
          <Separator />
          <MenuRow
            label="Firmware"
            onPress={() => router.push('/firmware-history' as Href)}
            subtitle="v1.4.0 - Up to date"
          />
          <Separator />
          <MenuRow
            danger
            label="Factory reset"
            onPress={confirmFactoryReset}
            subtitle="Erase all settings"
          />
        </Section>

        <Section title="ABOUT">
          <MenuRow label="Privacy policy" onPress={() => router.push('/privacy' as Href)} />
          <Separator />
          <MenuRow label="Terms of service" onPress={() => router.push('/terms' as Href)} />
          <Separator />
          <MenuRow hideChevron label="App version" subtitle={appVersion} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#091121',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 14,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerTitle: {
    color: '#F4F7FF',
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    paddingBottom: 28,
    paddingHorizontal: 4,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#7A8CAE',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 8,
    marginHorizontal: 8,
  },
  card: {
    backgroundColor: '#0F1220',
    borderColor: 'rgba(244,114,182,0.22)',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dangerRow: {
    backgroundColor: 'rgba(244,114,182,0.08)',
  },
  rowText: {
    flex: 1,
    paddingRight: 12,
  },
  rowLabel: {
    color: '#F4F7FF',
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: '#7A8CAE',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  separator: {
    backgroundColor: 'rgba(244,114,182,0.14)',
    height: 1,
    marginLeft: 14,
  },
  dangerText: {
    color: '#F472B6',
  },
  pressed: {
    opacity: 0.72,
  },
});
