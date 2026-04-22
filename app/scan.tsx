import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useBluetoothSession } from '@/src/hooks/useBluetoothSession';
import {
  scanForVisioballs,
  stopScanning,
  TARGET_BLE_DEVICE_NAME,
} from '@/src/services/bluetoothService';
import { BallDevice } from '@/src/types/bluetooth';

export default function ScanScreen() {
  const router = useRouter();
  const { connectToBall, disconnectFromBall, connectedDevice, isConnected } =
    useBluetoothSession();

  const [devices, setDevices] = useState<BallDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(
    isConnected ? connectedDevice?.id ?? null : null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void loadDevices();

    return () => {
      void stopScanning();
    };
  }, [loadDevices]);

  useEffect(() => {
    if (isConnected && connectedDevice) {
      setConnectedDeviceId(connectedDevice.id);
      return;
    }

    setConnectedDeviceId(null);
  }, [connectedDevice, isConnected]);

  const handleConnect = async (device: BallDevice) => {
    try {
      setConnectingId(device.id);

      const success = await connectToBall(device);

      if (success) {
        setConnectedDeviceId(device.id);
        return;
      }

      Alert.alert('Failed', 'Could not connect to the ball.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong while connecting.';

      Alert.alert('Error', message);
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (device: BallDevice) => {
    try {
      setDisconnectingId(device.id);
      await disconnectFromBall();
      setConnectedDeviceId(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong while disconnecting.';

      Alert.alert('Disconnect failed', message);
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleContinue = () => {
    if (!connectedDeviceId) {
      return;
    }

    router.replace('/control');
  };

  const renderDevice = ({ item }: { item: BallDevice }) => {
    const isRowConnected = connectedDeviceId === item.id;
    const isConnecting = connectingId === item.id;
    const isDisconnecting = disconnectingId === item.id;
    const isBusy = connectingId !== null || disconnectingId !== null;
    const isDisabled = isBusy && !isConnecting && !isDisconnecting;
    const deviceName = item.name?.trim() || TARGET_BLE_DEVICE_NAME;
    const buttonLabel = isDisconnecting
      ? 'Disconnecting...'
      : isRowConnected
        ? 'Disconnect'
        : isConnecting
          ? 'Connecting...'
          : 'Connect';

    return (
      <View style={styles.deviceRow}>
        <View style={styles.deviceTextBlock}>
          <Text style={styles.deviceId} numberOfLines={1}>
            {item.id}
          </Text>
          <Text style={styles.deviceName} numberOfLines={1}>
            {deviceName}
            {item.rssi != null ? ` | ${item.rssi} dBm` : ''}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.connectButton,
            isRowConnected && styles.connectedButton,
            (isDisabled || isConnecting || isDisconnecting) &&
              !isRowConnected &&
              styles.connectButtonDisabled,
            pressed && !isDisabled && styles.buttonPressed,
          ]}
          onPress={() => {
            if (isRowConnected) {
              void handleDisconnect(item);
              return;
            }

            void handleConnect(item);
          }}
          disabled={isDisabled || isConnecting || isDisconnecting}
        >
          <Text style={[styles.connectButtonText, isRowConnected && styles.connectedButtonText]}>
            {buttonLabel}
          </Text>
        </Pressable>
      </View>
    );
  };

  const renderDeviceArea = () => {
    if (loading) {
      return (
        <View style={styles.messageCard}>
          <ActivityIndicator color={COLORS.green} />
          <Text style={styles.messageText}>Scanning for {TARGET_BLE_DEVICE_NAME}...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable style={styles.inlineButton} onPress={() => void loadDevices()}>
            <Text style={styles.inlineButtonText}>Scan Again</Text>
          </Pressable>
        </View>
      );
    }

    if (devices.length === 0) {
      return (
        <View style={styles.messageCard}>
          <Text style={styles.emptyTitle}>No Visioball found</Text>
          <Text style={styles.messageText}>Move closer to the ESP32 and try scanning again.</Text>
          <Pressable style={styles.inlineButton} onPress={() => void loadDevices()}>
            <Text style={styles.inlineButtonText}>Scan Again</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={renderDevice}
        scrollEnabled={devices.length > 5}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.container}>
        <Text style={styles.title}>Connect to the{'\n'}visioBall</Text>

        <View style={styles.panel}>
          <Text style={styles.scanningText}>
            {loading ? 'Searching for nearby devices...' : 'Nearby devices'}
          </Text>

          <View style={styles.ballBeacon}>
            <View style={styles.beaconGlow} />
            <View style={styles.beaconCore}>
              <Text style={styles.beaconText}>B</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.devicesArea}>{renderDeviceArea()}</View>

          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              !connectedDeviceId && styles.continueButtonDisabled,
              pressed && connectedDeviceId && styles.buttonPressed,
            ]}
            onPress={handleContinue}
            disabled={!connectedDeviceId}
          >
            <Text
              style={[
                styles.continueButtonText,
                !connectedDeviceId && styles.continueButtonTextDisabled,
              ]}
            >
              Continue
            </Text>
          </Pressable>

          {/* SKIP CONNECTION BUTTON */}
          <Pressable
            style={({ pressed }) => [
              styles.skipButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.replace('/control')}
          >
            <Text style={styles.skipButtonText}>
              Skip Connection
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const COLORS = {
  background: '#080F1E',
  panel: '#10182A',
  row: '#1C273A',
  rowPressed: '#24324B',
  green: '#28E27F',
  greenDeep: '#052D1B',
  greenSoft: '#7EF7B2',
  text: '#F5F8FF',
  muted: '#97A1B5',
  line: '#233047',
  button: '#25314A',
  buttonDisabled: '#1B2537',
  danger: '#FF7A8A',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 18,
    paddingTop: 52,
    paddingBottom: 24,
  },
  title: {
    alignSelf: 'center',
    maxWidth: 280,
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 33,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 46,
  },
  panel: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 28,
  },
  scanningText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  ballBeacon: {
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beaconGlow: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(40, 226, 127, 0.14)',
  },
  beaconCore: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#123D29',
  },
  beaconText: {
    color: COLORS.green,
    fontSize: 17,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.line,
    marginBottom: 14,
  },
  devicesArea: {
    flex: 1,
    minHeight: 220,
  },
  deviceRow: {
    minHeight: 54,
    borderRadius: 10,
    backgroundColor: COLORS.row,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  deviceTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  deviceId: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  deviceName: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  connectButton: {
    minWidth: 108,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.button,
  },
  connectButtonDisabled: {
    backgroundColor: COLORS.buttonDisabled,
  },
  connectedButton: {
    backgroundColor: COLORS.green,
  },
  connectButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
  },
  connectedButtonText: {
    color: '#03140B',
  },
  messageCard: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(28, 39, 58, 0.64)',
    padding: 20,
  },
  messageText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '900',
  },
  inlineButton: {
    marginTop: 18,
    borderRadius: 12,
    backgroundColor: COLORS.button,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  inlineButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '900',
  },
  continueButton: {
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.row,
    marginTop: 18,
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.buttonDisabled,
  },
  continueButtonText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  continueButtonTextDisabled: {
    color: COLORS.muted,
  },
  skipButton: {
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  skipButtonText: {
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.85,
    backgroundColor: COLORS.rowPressed,
    transform: [{ scale: 0.98 }],
  },
});