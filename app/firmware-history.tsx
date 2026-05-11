import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type FirmwareUpdate = {
  changes: string[];
  date: string;
  title: string;
  version: string;
};

const updates: FirmwareUpdate[] = [
  {
    version: 'v2.4.1',
    title: 'Low power test mode',
    date: 'May 2026',
    changes: [
      'Added BLE SLEEP and WAKE commands for app-controlled low power testing.',
      'Low power mode now turns the light off without disconnecting the phone.',
      'The ball remembers if blinking was active and resumes it automatically after wake.',
      'Added STATUS? feedback for current power mode, blink state, and blink frequency.',
    ],
  },
  {
    version: 'v2.3.0',
    title: 'BLE command controls',
    date: 'April 2026',
    changes: [
      'Added ON and OFF commands to start and stop the LED behavior from the app.',
      'Added FREQ:<hz> command with a safe 1 Hz to 10 Hz range.',
      'Added BLE status notifications so the app can receive firmware feedback.',
    ],
  },
  {
    version: 'v2.2.0',
    title: 'Connection recovery',
    date: 'April 2026',
    changes: [
      'Improved advertising restart after phone disconnects.',
      'Kept the BLE UART-style service UUID stable for the mobile app.',
      'Added serial logs for connection and command debugging.',
    ],
  },
  {
    version: 'v2.1.0',
    title: 'VisioBall BLE identity',
    date: 'April 2026',
    changes: [
      'Set the advertised BLE device name to VisioBal.',
      'Exposed separate RX write and TX notify characteristics.',
      'Prepared the firmware for app-based control instead of manual testing only.',
    ],
  },
];

function FirmwareCard({ changes, date, title, version }: FirmwareUpdate) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.version}>{version}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.date}>{date}</Text>
      </View>

      {changes.map((change) => (
        <View key={change} style={styles.changeRow}>
          <View style={styles.dot} />
          <Text style={styles.changeText}>{change}</Text>
        </View>
      ))}
    </View>
  );
}

export default function FirmwareHistoryScreen() {
  const router = useRouter();

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
        <Text style={styles.headerTitle}>Firmware History</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Update notes for the ESP32 firmware used by the VisioBall prototype.
        </Text>
        {updates.map((update) => (
          <FirmwareCard key={update.version} {...update} />
        ))}
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
  intro: {
    color: '#7A8CAE',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: '#0F1220',
    borderColor: 'rgba(244,114,182,0.22)',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  version: {
    color: '#F472B6',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },
  title: {
    color: '#F4F7FF',
    fontSize: 16,
    fontWeight: '800',
  },
  date: {
    color: '#7A8CAE',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  changeRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    marginTop: 9,
  },
  dot: {
    backgroundColor: '#F472B6',
    borderRadius: 3,
    height: 6,
    marginTop: 7,
    width: 6,
  },
  changeText: {
    color: '#7A8CAE',
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
  },
});
