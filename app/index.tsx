import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useBluetoothSession } from './hooks/useBluetoothSession';

export default function HomeScreen() {
  const router = useRouter();
  const { connectedDevice, isConnected, disconnectFromBall } = useBluetoothSession();

  const handleDisconnect = async () => {
    try {
      await disconnectFromBall();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not disconnect from the device.';

      Alert.alert('Disconnect failed', message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Visioball</Text>
      <Text style={styles.status}>
        Status: {isConnected && connectedDevice ? `Connected to ${connectedDevice.name}` : 'Not connected'}
      </Text>

      <Pressable
        style={styles.button}
        onPress={() => router.push(isConnected ? '/control' : '/scan')}>
        <Text style={styles.buttonText}>{isConnected ? 'Open Controls' : 'Connect to Ball'}</Text>
      </Pressable>

      {isConnected && (
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => void handleDisconnect()}>
          <Text style={styles.buttonText}>Disconnect</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: 'white',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
  },
  status: {
    color: '#ccc',
    fontSize: 18,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 200,
  },
  secondaryButton: {
    backgroundColor: '#334155',
    marginTop: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
