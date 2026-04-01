import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';


import DeviceListItem from './components/deviceListItem';
import { connectToBall, scanForVisioballs, stopScanning } from './services/bluetoothService';
import { BallDevice } from './types/bluetooth';


export default function ScanScreen() {
  const router = useRouter();

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
        Alert.alert('Connected', `Connected to ${device.name}`);
        router.replace('/');
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nearby Visioballs</Text>
      <Text style={styles.subtitle}>Searching for BLE devices whose name contains visiobal</Text>

      {loading ? (
        <Text style={styles.info}>Scanning for devices...</Text>
      ) : errorMessage ? (
        <Text style={styles.info}>{errorMessage}</Text>
      ) : devices.length === 0 ? (
        <Text style={styles.info}>No BLE devices named visiobal were found.</Text>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View>
              <DeviceListItem device={item} onPress={handleConnect} />
              {connectingId === item.id && (
                <Text style={styles.connecting}>Connecting...</Text>
              )}
            </View>
          )}
        />
      )}

      <Pressable style={styles.button} onPress={() => void loadDevices()}>
        <Text style={styles.buttonText}>{loading ? 'Scanning...' : 'Scan Again'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
    marginBottom: 20,
  },
  info: {
    color: '#ccc',
    fontSize: 18,
    marginBottom: 20,
  },
  connecting: {
    color: '#60a5fa',
    marginBottom: 12,
    marginTop: -4,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
