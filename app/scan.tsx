import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import DeviceListItem from '@/src/components/deviceListItem';
import { useBluetoothSession } from '@/src/hooks/useBluetoothSession';
import {
  scanForVisioballs,
  stopScanning,
  TARGET_BLE_DEVICE_NAME,
} from '@/src/services/bluetoothService';
import { BallDevice } from '@/src/types/bluetooth';

const COLORS = {
  background: '#F4F8FC',
  surface: '#FFFFFF',
  primary: '#2563EB',
  primaryDark: '#1E3A8A',
  primarySoft: '#DBEAFE',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#D6DEE8',
  card: '#F8FAFC',
  success: '#22C55E',
  successSoft: '#DCFCE7',
  danger: '#DC2626',
  shadow: '#0F172A',
};

export default function ScanScreen() {
  const router = useRouter();
  const { connectToBall } = useBluetoothSession();

  const [devices, setDevices] = useState<BallDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDevices = async () => {
    setLoading(true);
    setErrorMessage(null);
    setDevices([]);

    try {
      const foundDevices = await scanForVisioballs();
      setDevices(foundDevices);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to scan for Bluetooth devices.';

      setErrorMessage(message);
      Alert.alert('Bluetooth scan failed', message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDevices();

    return () => {
      void stopScanning();
    };
  }, []);

  const handleConnect = async (device: BallDevice) => {
    try {
      setConnectingId(device.id);

      const success = await connectToBall(device);

      if (success) {
        Alert.alert('Connected', `Connected to ${device.name || 'Visioball'}`);
        router.replace('/control');
      } else {
        Alert.alert('Failed', 'Could not connect to the ball.');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong while connecting.';

      Alert.alert('Error', message);
    } finally {
      setConnectingId(null);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <Text style={styles.infoText}>Scanning for nearby devices...</Text>;
    }

    if (errorMessage) {
      return <Text style={styles.errorText}>{errorMessage}</Text>;
    }

    if (devices.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Visioball found</Text>
          <Text style={styles.emptySubtitle}>
            We only search for devices named {TARGET_BLE_DEVICE_NAME}.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <DeviceListItem
            device={item}
            onPress={handleConnect}
            isConnecting={connectingId === item.id}
            disabled={connectingId !== null}
          />
        )}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Connect to the Visioball</Text>
          <Text style={styles.subtitle}>
            Searching only for {TARGET_BLE_DEVICE_NAME}
          </Text>
        </View>

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.sectionLabel}>Nearby devices</Text>

          <View style={styles.bluetoothIconWrap}>
            <Text style={styles.bluetoothIcon}>⌁</Text>
          </View>

          <View style={styles.content}>{renderContent()}</View>

          <Pressable
            style={({ pressed }) => [
              styles.scanButton,
              (loading || connectingId !== null) && styles.scanButtonDisabled,
              pressed && !loading && connectingId === null && styles.scanButtonPressed,
            ]}
            onPress={() => void loadDevices()}
            disabled={loading || connectingId !== null}
          >
            <Text style={styles.scanButtonText}>
              {loading ? 'Scanning...' : 'Scan Again'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 38,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  sheet: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    marginBottom: 16,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 16,
  },
  bluetoothIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  bluetoothIcon: {
    fontSize: 42,
    color: COLORS.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  infoText: {
    color: COLORS.textMuted,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  emptyState: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginTop: 8,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  scanButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  scanButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  scanButtonPressed: {
    opacity: 0.9,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});