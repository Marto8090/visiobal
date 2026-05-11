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

function PolicySection({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

export default function PrivacyScreen() {
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
          <Ionicons color="#F8FAFC" name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.updated}>Last updated: May 11, 2026</Text>
          <Text style={styles.intro}>
            VisioBall is a student prototype app used to connect to and control a BLE ball device.
            This policy explains what information the prototype may use while testing.
          </Text>

          <PolicySection
            title="Information we use"
            body="The app may use Bluetooth device names, device identifiers, signal strength, and connection status to find and connect to nearby VisioBall devices. These details are used only inside the app for the connection flow."
          />
          <PolicySection
            title="Bluetooth and permissions"
            body="Bluetooth permissions are required so the app can scan for nearby BLE devices and connect to the selected ball. On Android, location-related permission may also be requested because the operating system requires it for Bluetooth scanning."
          />
          <PolicySection
            title="Data storage"
            body="At this stage, the app does not send personal data to an external server. Settings shown in the app are currently prototype controls and may only be kept locally while the app is running."
          />
          <PolicySection
            title="Future features"
            body="Later versions may add account features, saved settings, analytics, or cloud services. If that happens, this privacy policy should be updated before those features are released."
          />
          <PolicySection
            title="Contact"
            body="For questions about this prototype, contact the VisioBall project team."
          />
        </View>
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
  card: {
    backgroundColor: '#121827',
    borderRadius: 12,
    padding: 16,
  },
  updated: {
    color: '#748098',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
  },
  intro: {
    color: '#D8DEE9',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    marginBottom: 18,
  },
  section: {
    borderTopColor: '#1E293B',
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 16,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  body: {
    color: '#9AA6BC',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
  },
});
