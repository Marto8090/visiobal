import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';


import DeviceListItem from './components/deviceListItem';
import { connectToBall, scanForVisioballs } from './services/bluetoothService';
import { BallDevice } from './types/bluetooth';


export default function ScanScreen() {
  const router = useRouter();

  const [devices, setDevices] = useState<BallDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const foundDevices = await scanForVisioballs();
        setDevices(foundDevices);
      } catch (error) {
        Alert.alert('Error', 'Failed to scan for devices.');
      } finally {
        setLoading(false);
      }
    };

    loadDevices();
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
      Alert.alert('Error', 'Something went wrong while connecting.');
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nearby Visioballs</Text>

      {loading ? (
        <Text style={styles.info}>Scanning for devices...</Text>
      ) : devices.length === 0 ? (
        <Text style={styles.info}>No Visioballs found.</Text>
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
    marginBottom: 20,
  },
  info: {
    color: '#ccc',
    fontSize: 18,
  },
  connecting: {
    color: '#60a5fa',
    marginBottom: 12,
    marginTop: -4,
  },
});
