import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/src/context/I18nContext';
import { ThemeColors, useTheme } from '@/src/context/ThemeContext';
import { useBluetoothSession } from '@/src/hooks/useBluetoothSession';
import { scanForVisioballs, stopScanning } from '@/src/services/bluetoothService';
import { BallDevice } from '@/src/types/bluetooth';

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bgDeep },
    safeArea: { flex: 1 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 4,
      paddingBottom: 0,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#A855F7',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 8,
    },
    titleBlock: { alignItems: 'center', paddingTop: 8, paddingBottom: 20 },
    title: { color: theme.text, fontSize: 28, fontWeight: '900', textAlign: 'center', lineHeight: 36, letterSpacing: -0.4 },
    beaconRow: { marginTop: 18, alignItems: 'center', justifyContent: 'center' },
    beaconPulse: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(168,85,247,0.15)' },
    beaconCore: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: 'rgba(168,85,247,0.2)',
      borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)',
      alignItems: 'center', justifyContent: 'center',
    },
    panel: {
      flex: 1,
      marginHorizontal: 18,
      marginBottom: 16,
      backgroundColor: theme.cardAlt,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: theme.borderAccent,
      borderTopWidth: 2,
      borderTopColor: 'rgba(168,85,247,0.6)',
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 12,
    },
    panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    scanningDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A855F7' },
    scanningLabel: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    divider: { height: 1, backgroundColor: theme.separator, marginBottom: 14 },
    devicesArea: { flex: 1, minHeight: 160 },
    deviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 10,
    },
    deviceRowConnected: {
      borderColor: 'rgba(168,85,247,0.4)',
      backgroundColor: 'rgba(168,85,247,0.08)',
    },
    deviceIcon: { width: 24, alignItems: 'center' },
    deviceTextBlock: { flex: 1 },
    deviceName: { color: theme.textMuted, fontSize: 14, fontWeight: '700' },
    deviceNameConnected: { color: theme.text },
    deviceId: { color: theme.textSubtle, fontSize: 11, fontWeight: '500', marginTop: 2 },
    deviceRssi: { color: theme.textSubtle, fontSize: 10, fontWeight: '500', marginTop: 1 },
    listSeparator: { height: 8 },
    connectBtn: {
      minWidth: 90, height: 36, borderRadius: 10, backgroundColor: '#A855F7',
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12,
      shadowColor: '#A855F7', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
    },
    connectBtnConnected: {
      backgroundColor: 'rgba(168,85,247,0.15)',
      borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)',
      shadowOpacity: 0, elevation: 0,
    },
    connectBtnDisabled: { backgroundColor: theme.card, shadowOpacity: 0, elevation: 0 },
    connectBtnText: { color: '#F9FAFB', fontSize: 13, fontWeight: '800' },
    connectBtnTextConnected: { color: '#A855F7' },
    stateCard: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 24 },
    stateText: { color: theme.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
    errorText: { color: '#F472B6', fontSize: 14, fontWeight: '700', textAlign: 'center', lineHeight: 20 },
    emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '900' },
    inlineBtn: {
      backgroundColor: 'rgba(168,85,247,0.15)',
      borderRadius: 12, borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
      paddingVertical: 10, paddingHorizontal: 20,
    },
    inlineBtnText: { color: '#A855F7', fontSize: 13, fontWeight: '800' },
    continueBtn: {
      flexDirection: 'row', height: 52, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#A855F7', marginTop: 16, gap: 10,
      shadowColor: '#A855F7', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8,
    },
    continueBtnDisabled: { backgroundColor: theme.card, shadowOpacity: 0, elevation: 0 },
    continueBtnText: { color: '#F9FAFB', fontSize: 16, fontWeight: '900' },
    continueBtnTextDisabled: { color: theme.textSubtle },
    skipBtn: {
      height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
      marginTop: 10, borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)',
    },
    skipBtnText: { color: theme.textMuted, fontSize: 14, fontWeight: '700' },
    pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  });
}

export default function ScanScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { connectToBall, disconnectFromBall, connectedDevice, isConnected } = useBluetoothSession();

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
      const message = error instanceof Error ? error.message : t('bluetoothFailed');
      setErrorMessage(message);
      Alert.alert(t('bluetoothFailed'), message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadDevices();
    return () => { void stopScanning(); };
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
      if (success) { setConnectedDeviceId(device.id); return; }
      Alert.alert(t('failed'), t('couldNotConnect'));
    } catch (error) {
      Alert.alert(t('failed'), error instanceof Error ? error.message : t('couldNotConnect'));
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
      Alert.alert(t('failed'), error instanceof Error ? error.message : t('couldNotConnect'));
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleContinue = () => {
    if (!connectedDeviceId) return;
    router.replace('/control');
  };

  const renderDevice = ({ item }: { item: BallDevice }) => {
    const isRowConnected = connectedDeviceId === item.id;
    const isConnecting = connectingId === item.id;
    const isDisconnecting = disconnectingId === item.id;
    const isBusy = connectingId !== null || disconnectingId !== null;
    const isDisabled = isBusy && !isConnecting && !isDisconnecting;
    const deviceName = item.name?.trim() || 'VisioBall Device';

    const buttonLabel = isDisconnecting
      ? t('disconnecting')
      : isRowConnected
        ? t('disconnect')
        : isConnecting
          ? t('connecting')
          : t('connect');

    return (
      <View style={[styles.deviceRow, isRowConnected && styles.deviceRowConnected]}>
        <View style={styles.deviceIcon}>
          <Ionicons
            name={isRowConnected ? 'checkmark-circle' : 'radio-button-off'}
            size={20}
            color={isRowConnected ? '#A855F7' : theme.textSubtle}
          />
        </View>
        <View style={styles.deviceTextBlock}>
          <Text style={[styles.deviceName, isRowConnected && styles.deviceNameConnected]} numberOfLines={1}>
            {deviceName}
          </Text>
          <Text style={styles.deviceId} numberOfLines={1}>{item.id}</Text>
          {item.rssi != null && <Text style={styles.deviceRssi}>{item.rssi} dBm</Text>}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.connectBtn,
            isRowConnected && styles.connectBtnConnected,
            (isDisabled || isConnecting || isDisconnecting) && !isRowConnected && styles.connectBtnDisabled,
            pressed && !isDisabled && styles.pressed,
          ]}
          onPress={() => {
            if (isRowConnected) { void handleDisconnect(item); return; }
            void handleConnect(item);
          }}
          disabled={isDisabled || isConnecting || isDisconnecting}
        >
          {(isConnecting || isDisconnecting)
            ? <ActivityIndicator size="small" color="#F9FAFB" />
            : <Text style={[styles.connectBtnText, isRowConnected && styles.connectBtnTextConnected]}>
                {buttonLabel}
              </Text>
          }
        </Pressable>
      </View>
    );
  };

  const renderDeviceArea = () => {
    if (loading) {
      return (
        <View style={styles.stateCard}>
          <ActivityIndicator color="#A855F7" size="large" />
          <Text style={styles.stateText}>{t('scanningDevices')}</Text>
        </View>
      );
    }
    if (errorMessage) {
      return (
        <View style={styles.stateCard}>
          <Ionicons name="warning-outline" size={32} color="#F472B6" />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable style={styles.inlineBtn} onPress={() => void loadDevices()}>
            <Text style={styles.inlineBtnText}>{t('scanAgain')}</Text>
          </Pressable>
        </View>
      );
    }
    if (devices.length === 0) {
      return (
        <View style={styles.stateCard}>
          <Ionicons name="bluetooth-outline" size={36} color={theme.textSubtle} />
          <Text style={styles.emptyTitle}>{t('noDeviceTitle')}</Text>
          <Text style={styles.stateText}>{t('noDeviceMessage')}</Text>
          <Pressable style={styles.inlineBtn} onPress={() => void loadDevices()}>
            <Text style={styles.inlineBtnText}>{t('scanAgain')}</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={renderDevice}
        scrollEnabled={devices.length > 4}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
      />
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[theme.gradStart, theme.gradMid, theme.gradEnd]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={theme.statusBarStyle} backgroundColor="transparent" translucent />

        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={26} color="#A855F7" />
          </Pressable>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{t('connectTitle')}</Text>
          <View style={styles.beaconRow}>
            <View style={styles.beaconPulse} />
            <View style={styles.beaconCore}>
              <Ionicons name="bluetooth" size={16} color="#A855F7" />
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.scanningDot} />
            <Text style={styles.scanningLabel}>
              {loading ? t('searchingDevices') : t('nearbyDevices')}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.devicesArea}>
            {renderDeviceArea()}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.continueBtn,
              !connectedDeviceId && styles.continueBtnDisabled,
              pressed && connectedDeviceId ? styles.pressed : null,
            ]}
            onPress={handleContinue}
            disabled={!connectedDeviceId}
          >
            <Ionicons
              name="arrow-forward-circle"
              size={20}
              color={connectedDeviceId ? '#F9FAFB' : theme.textSubtle}
            />
            <Text style={[styles.continueBtnText, !connectedDeviceId && styles.continueBtnTextDisabled]}>
              {t('continueBtn')}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
            onPress={() => router.replace('/control')}
          >
            <Text style={styles.skipBtnText}>{t('skipConnection')}</Text>
          </Pressable>
        </View>

      </SafeAreaView>
    </View>
  );
}
