import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BallDevice } from '../types/bluetooth';

type Props = {
  device: BallDevice;
  onPress: (device: BallDevice) => void;
  isConnecting?: boolean;
  disabled?: boolean;
};

const COLORS = {
  surface: '#FFFFFF',
  primary: '#2563EB',
  primarySoft: '#DBEAFE',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#D6DEE8',
  card: '#F8FAFC',
};

export default function DeviceListItem({
  device,
  onPress,
  isConnecting = false,
  disabled = false,
}: Props) {
  const deviceName = device.name?.trim() || 'Visioball Device';

  return (
    <View style={styles.item}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {deviceName}
        </Text>

        <Text style={styles.id} numberOfLines={1}>
          {device.id}
        </Text>

        {device.rssi != null && <Text style={styles.meta}>Signal: {device.rssi} dBm</Text>}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.connectButton,
          (disabled || isConnecting) && styles.connectButtonDisabled,
          pressed && !disabled && !isConnecting && styles.connectButtonPressed,
        ]}
        onPress={() => onPress(device)}
        disabled={disabled || isConnecting}
      >
        <Text style={styles.connectButtonText}>
          {isConnecting ? 'Connecting...' : 'Connect'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  id: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  meta: {
    color: COLORS.primary,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  connectButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    minWidth: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  connectButtonPressed: {
    opacity: 0.9,
  },
  connectButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '700',
  },
});