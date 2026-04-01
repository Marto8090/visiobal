import { Pressable, StyleSheet, Text } from 'react-native';
import { BallDevice } from '../types/bluetooth';

type Props = {
  device: BallDevice;
  onPress: (device: BallDevice) => void;
};

export default function DeviceListItem({ device, onPress }: Props) {
  return (
    <Pressable style={styles.item} onPress={() => onPress(device)}>
      <Text style={styles.name}>{device.name}</Text>
      <Text style={styles.id}>ID: {device.id}</Text>
      {device.rssi != null && <Text style={styles.meta}>RSSI: {device.rssi} dBm</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  name: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  id: {
    color: '#aaa',
    marginTop: 4,
  },
  meta: {
    color: '#60a5fa',
    marginTop: 4,
  },
});
