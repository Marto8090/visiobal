import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
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
        ios_backgroundColor="#1C2540"
        onValueChange={onValueChange}
        thumbColor="#FFFFFF"
        trackColor={{ false: '#1C2540', true: '#22C55E' }}
        value={value}
      />
    </View>
  );
}

function MenuRow({ danger = false, hideChevron = false, label, onPress, subtitle }: MenuRowProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {!hideChevron && <Ionicons color="#748098" name="chevron-forward" size={18} />}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const [pushNotifications, setPushNotifications] = useState(true);
  const [connectionAlerts, setConnectionAlerts] = useState(false);
  const [batteryWarnings, setBatteryWarnings] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons color="#F8FAFC" name="arrow-back" size={22} />
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
          <MenuRow label="Device name" subtitle="VisioBall - Device A4" />
          <Separator />
          <MenuRow label="Firmware" subtitle="v2.4.1 - Up to date" />
          <Separator />
          <MenuRow danger label="Factory reset" subtitle="Erase all settings" />
        </Section>

        <Section title="ABOUT">
          <MenuRow label="Privacy policy" onPress={() => router.push('/privacy' as Href)} />
          <Separator />
          <MenuRow label="Terms of service" />
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
    backgroundColor: '#080B14',
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
    color: '#F8FAFC',
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
    color: '#748098',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 8,
    marginHorizontal: 8,
  },
  card: {
    backgroundColor: '#121827',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowText: {
    flex: 1,
    paddingRight: 12,
  },
  rowLabel: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: '#748098',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  separator: {
    backgroundColor: '#1E293B',
    height: 1,
    marginLeft: 14,
  },
  dangerText: {
    color: '#EF4444',
  },
  pressed: {
    opacity: 0.72,
  },
});
