import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/src/context/I18nContext';
import { ThemeColors, useTheme } from '@/src/context/ThemeContext';

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

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.bg },
    header: { alignItems: 'center', flexDirection: 'row', paddingBottom: 14, paddingHorizontal: 8, paddingTop: 8 },
    backButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
    headerTitle: { color: theme.text, flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center' },
    headerSpacer: { width: 44 },
    content: { paddingBottom: 28, paddingHorizontal: 16 },
    intro: { color: theme.textMuted, fontSize: 13, fontWeight: '600', lineHeight: 20, marginBottom: 14 },
    card: { backgroundColor: theme.card, borderColor: theme.borderAccent, borderRadius: 18, borderWidth: 1, marginBottom: 14, padding: 16 },
    cardHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, gap: 12 },
    version: { color: '#F472B6', fontSize: 13, fontWeight: '900', marginBottom: 4 },
    title: { color: theme.text, fontSize: 16, fontWeight: '800' },
    date: { color: theme.textMuted, fontSize: 12, fontWeight: '700', marginTop: 1 },
    changeRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, marginTop: 9 },
    dot: { backgroundColor: '#F472B6', borderRadius: 3, height: 6, marginTop: 7, width: 6 },
    changeText: { color: theme.textMuted, flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 20 },
    pressed: { opacity: 0.72 },
  });
}

function FirmwareCard({ changes, date, styles, title, version }: FirmwareUpdate & { styles: ReturnType<typeof makeStyles> }) {
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
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.statusBarStyle} />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons color="#F472B6" name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('firmwareHistory')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{t('firmwareIntro')}</Text>
        {updates.map((update) => (
          <FirmwareCard key={update.version} styles={styles} {...update} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
