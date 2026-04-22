import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
  const { connectToBall, disconnectFromBall, connectedDevice, isConnected } = useBluetoothSession();

  const [devices, setDevices] = useState<BallDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(
    isConnected ? connectedDevice?.id ?? null : null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pulse animation for the beacon
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }, [pulseAnim]);

  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.5, 0.15, 0] });

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setDevices([]);
    try {
      const found = await scanForVisioballs();
      setDevices(found);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to scan for Bluetooth devices.';
      setErrorMessage(msg);
      Alert.alert('Bluetooth scan failed', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
    return () => { void stopScanning(); };
  }, [loadDevices]);

  useEffect(() => {
    if (isConnected && connectedDevice) { setConnectedDeviceId(connectedDevice.id); return; }
    setConnectedDeviceId(null);
  }, [connectedDevice, isConnected]);

  const handleConnect = async (device: BallDevice) => {
    try {
      setConnectingId(device.id);
      const success = await connectToBall(device);
      if (success) { setConnectedDeviceId(device.id); return; }
      Alert.alert('Failed', 'Could not connect to the ball.');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong while connecting.');
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
      Alert.alert('Disconnect failed', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setDisconnectingId(null);
    }
  };

  const renderDevice = ({ item }: { item: BallDevice }) => {
    const isRowConnected = connectedDeviceId === item.id;
    const isConnecting = connectingId === item.id;
    const isDisconnecting = disconnectingId === item.id;
    const isBusy = connectingId !== null || disconnectingId !== null;
    const isDisabled = isBusy && !isConnecting && !isDisconnecting;
    const deviceName = item.name?.trim() || TARGET_BLE_DEVICE_NAME;
    const label = isDisconnecting ? 'Disconnecting…' : isRowConnected ? 'Disconnect' : isConnecting ? 'Connecting…' : 'Connect';

    return (
      <Pressable
        disabled={isDisabled || isConnecting || isDisconnecting}
        onPress={() => isRowConnected ? void handleDisconnect(item) : void handleConnect(item)}
        style={({ pressed }) => [styles.deviceRow, isRowConnected && styles.deviceRowConnected, pressed && !isDisabled && styles.pressed]}
      >
        <View style={[styles.deviceDot, isRowConnected && styles.deviceDotActive]} />
        <View style={styles.deviceText}>
          <Text style={styles.deviceName} numberOfLines={1}>{deviceName}</Text>
          <Text style={styles.deviceId} numberOfLines={1}>{item.id}{item.rssi != null ? `  ·  ${item.rssi} dBm` : ''}</Text>
        </View>
        <View style={[styles.connectBtn, isRowConnected && styles.connectBtnActive, (isDisabled && !isRowConnected) && styles.connectBtnDisabled]}>
          {(isConnecting || isDisconnecting) ? (
            <ActivityIndicator size="small" color={isRowConnected ? '#080B14' : '#F1F5FF'} />
          ) : (
            <Text style={[styles.connectBtnText, isRowConnected && styles.connectBtnTextActive]}>{label}</Text>
          )}
        </View>
      </Pressable>
    );
  };

  const renderContent = () => {
    if (loading) return (
      <View style={styles.emptyState}>
        <ActivityIndicator color="#DC2626" size="large" />
        <Text style={styles.emptyText}>Scanning for {TARGET_BLE_DEVICE_NAME}…</Text>
      </View>
    );

    if (errorMessage) return (
      <View style={styles.emptyState}>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Pressable style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]} onPress={() => void loadDevices()}>
          <Text style={styles.retryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );

    if (devices.length === 0) return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No device found</Text>
        <Text style={styles.emptyText}>Move closer to the VisioBall and try again.</Text>
        <Pressable style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]} onPress={() => void loadDevices()}>
          <Text style={styles.retryBtnText}>Scan again</Text>
        </Pressable>
      </View>
    );

    return (
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={renderDevice}
        scrollEnabled={devices.length > 4}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080B14" />
      <View style={styles.container}>

        <View style={styles.header}>
          <Text style={styles.title}>Connect to{'\n'}VisioBall</Text>
          <Text style={styles.subtitle}>Make sure your ball is powered on</Text>
        </View>

        {/* Beacon animation */}
        <View style={styles.beaconWrap}>
          <Animated.View style={[styles.beaconPulse, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
          <View style={styles.beaconCore}>
            <View style={styles.beaconBall} />
          </View>
          <Text style={styles.beaconLabel}>{loading ? 'Scanning…' : `${devices.length} device${devices.length !== 1 ? 's' : ''} found`}</Text>
        </View>

        {/* Device panel */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Nearby devices</Text>
            <Pressable style={({ pressed }) => [styles.rescanBtn, pressed && styles.pressed]} onPress={() => void loadDevices()} disabled={loading}>
              <Text style={styles.rescanText}>{loading ? 'Scanning…' : 'Rescan'}</Text>
            </Pressable>
          </View>

          <View style={styles.divider} />
          <View style={styles.devicesArea}>{renderContent()}</View>

          <Pressable
            disabled={!connectedDeviceId}
            onPress={() => connectedDeviceId && router.replace('/control')}
            style={({ pressed }) => [styles.continueBtn, !connectedDeviceId && styles.continueBtnDisabled, pressed && connectedDeviceId && styles.pressed]}
          >
            <Text style={[styles.continueBtnText, !connectedDeviceId && styles.continueBtnTextDisabled]}>Continue</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
            onPress={() => router.replace('/control')}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080B14' },
  container: { flex: 1, backgroundColor: '#080B14', paddingHorizontal: 20, paddingTop: 44, paddingBottom: 24 },

  header: { marginBottom: 28 },
  title: { color: '#F1F5FF', fontSize: 30, fontWeight: '900', letterSpacing: -0.5, lineHeight: 36 },
  subtitle: { color: '#4A5268', fontSize: 14, fontWeight: '500', marginTop: 6 },

  beaconWrap: { alignItems: 'center', marginBottom: 28, height: 88 },
  beaconPulse: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(220,38,38,0.35)' },
  beaconCore: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#161A2E', borderWidth: 1.5, borderColor: 'rgba(220,38,38,0.35)', alignItems: 'center', justifyContent: 'center' },
  beaconBall: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#DC2626' },
  beaconLabel: { color: '#8892A8', fontSize: 12, fontWeight: '600', marginTop: 8, letterSpacing: 0.5 },

  panel: { flex: 1, backgroundColor: '#0F1220', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  panelTitle: { color: '#8892A8', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  rescanBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: '#1C2238' },
  rescanText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 14 },
  devicesArea: { flex: 1, minHeight: 200 },

  deviceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161A2E', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  deviceRowConnected: { borderColor: 'rgba(34,197,94,0.35)', backgroundColor: '#0F1D18' },
  deviceDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2A3050', marginRight: 12 },
  deviceDotActive: { backgroundColor: '#22C55E' },
  deviceText: { flex: 1, marginRight: 10 },
  deviceName: { color: '#F1F5FF', fontSize: 14, fontWeight: '700' },
  deviceId: { color: '#4A5268', fontSize: 11, fontWeight: '500', marginTop: 2 },
  connectBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#1C2238', minWidth: 92, alignItems: 'center' },
  connectBtnActive: { backgroundColor: '#22C55E' },
  connectBtnDisabled: { opacity: 0.4 },
  connectBtnText: { color: '#F1F5FF', fontSize: 12, fontWeight: '800' },
  connectBtnTextActive: { color: '#080B14' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  emptyTitle: { color: '#F1F5FF', fontSize: 16, fontWeight: '800' },
  emptyText: { color: '#4A5268', fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  errorText: { color: '#FF6B6B', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#161A2E', marginTop: 8 },
  retryBtnText: { color: '#DC2626', fontSize: 13, fontWeight: '700' },

  continueBtn: { height: 54, borderRadius: 14, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  continueBtnDisabled: { backgroundColor: '#161A2E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  continueBtnText: { color: '#F1F5FF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  continueBtnTextDisabled: { color: '#4A5268' },
  skipBtn: { height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  skipText: { color: '#4A5268', fontSize: 14, fontWeight: '600' },

  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});