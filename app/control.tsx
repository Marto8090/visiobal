import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FrequencySlider } from '@/src/components/FrequencySlider';
import { useBluetoothSession } from '@/src/hooks/useBluetoothSession';
import {
  COMMAND_CHARACTERISTIC_UUID,
  COMMAND_SERVICE_UUID,
} from '@/src/services/bluetoothService';

const PRESET_COMMANDS = ['ON', 'OFF'];
const MIN_BLINK_FREQUENCY_HZ = 1;
const MAX_BLINK_FREQUENCY_HZ = 10;
const DEFAULT_BLINK_FREQUENCY_HZ = 3;

function formatFrequencyCommand(frequencyHz: number) {
  return `FREQ:${frequencyHz}`;
}

export default function ControlScreen() {
  const router = useRouter();
  const { canSendCommands, connectedDevice, disconnectFromBall, isConnected, sendCommandToBall } =
    useBluetoothSession();

  const [commandDraft, setCommandDraft] = useState('ON');
  const [isLightOn, setIsLightOn] = useState(false);
  const [blinkFrequencyHz, setBlinkFrequencyHz] = useState(DEFAULT_BLINK_FREQUENCY_HZ);
  const [sending, setSending] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  const applyCommandSideEffects = (command: string) => {
    const normalizedCommand = command.trim().toUpperCase();

    if (normalizedCommand === 'ON') {
      setIsLightOn(true);
      return;
    }

    if (normalizedCommand === 'OFF') {
      setIsLightOn(false);
      return;
    }

    if (normalizedCommand.startsWith('FREQ:')) {
      const parsedFrequency = Number.parseInt(normalizedCommand.slice('FREQ:'.length), 10);

      if (!Number.isNaN(parsedFrequency)) {
        setBlinkFrequencyHz(
          Math.min(Math.max(parsedFrequency, MIN_BLINK_FREQUENCY_HZ), MAX_BLINK_FREQUENCY_HZ)
        );
      }
    }
  };

  const handleSendCommand = async (command: string, successTitle = 'Command sent') => {
    const trimmedCommand = command.trim();

    if (!trimmedCommand) {
      Alert.alert('Missing command', 'Enter a command before sending.');
      return false;
    }

    try {
      setSending(true);
      await sendCommandToBall(trimmedCommand);
      applyCommandSideEffects(trimmedCommand);
      setLastCommand(trimmedCommand);
      Alert.alert(
        successTitle,
        `Sent "${trimmedCommand}" to ${connectedDevice?.name ?? 'the device'}.`
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send the command.';
      Alert.alert('Command failed', message);
      return false;
    } finally {
      setSending(false);
    }
  };

  const handleFrequencyCommit = async (frequencyHz: number) => {
    if (!isLightOn || sending || !canSendCommands) {
      return;
    }

    await handleSendCommand(formatFrequencyCommand(frequencyHz), 'Blink frequency updated');
  };

  const handleDisconnect = async () => {
    try {
      await disconnectFromBall();
      router.replace('/');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not disconnect from the device.';

      Alert.alert('Disconnect failed', message);
    }
  };

  if (!isConnected || !connectedDevice) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Ball Controls</Text>
        <Text style={styles.info}>No ball is connected yet.</Text>

        <Pressable style={styles.primaryButton} onPress={() => router.replace('/scan')}>
          <Text style={styles.buttonText}>Scan for Ball</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ball Controls</Text>
      <Text style={styles.subtitle}>Connected to {connectedDevice.name}</Text>
      <Text style={styles.meta}>Device ID: {connectedDevice.id}</Text>
      {connectedDevice.rssi != null && <Text style={styles.meta}>RSSI: {connectedDevice.rssi} dBm</Text>}

      {!canSendCommands && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>Command channel not configured</Text>
          <Text style={styles.noticeText}>
            Set `COMMAND_SERVICE_UUID` and `COMMAND_CHARACTERISTIC_UUID` in `src/services/bluetoothService.ts`
            to match your ESP32 BLE GATT characteristic.
          </Text>
          <Text style={styles.noticeText}>Service UUID: {String(COMMAND_SERVICE_UUID)}</Text>
          <Text style={styles.noticeText}>Characteristic UUID: {String(COMMAND_CHARACTERISTIC_UUID)}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Preset Commands</Text>
      <View style={styles.commandGrid}>
        {PRESET_COMMANDS.map((command) => (
          <Pressable
            key={command}
            style={[
              styles.commandButton,
              ((command === 'ON' && isLightOn) || (command === 'OFF' && !isLightOn)) &&
                styles.commandButtonActive,
              (!canSendCommands || sending) && styles.commandButtonDisabled,
            ]}
            disabled={!canSendCommands || sending}
            onPress={() => void handleSendCommand(command)}>
            <Text style={styles.buttonText}>{command}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Blink Frequency</Text>
      <Text style={styles.info}>
        {isLightOn
          ? `Selected: ${blinkFrequencyHz} Hz (${Math.round(1000 / blinkFrequencyHz)} ms interval)`
          : 'Turn the light on first, then adjust how fast it blinks.'}
      </Text>
      <View style={styles.sliderCard}>
        <View style={styles.sliderScale}>
          <Text style={styles.scaleLabel}>{MIN_BLINK_FREQUENCY_HZ} Hz</Text>
          <Text style={styles.scaleLabel}>{MAX_BLINK_FREQUENCY_HZ} Hz</Text>
        </View>
        <FrequencySlider
          disabled={!canSendCommands || sending || !isLightOn}
          maximumValue={MAX_BLINK_FREQUENCY_HZ}
          minimumValue={MIN_BLINK_FREQUENCY_HZ}
          onSlidingComplete={(value) => void handleFrequencyCommit(value)}
          onValueChange={setBlinkFrequencyHz}
          step={1}
          value={blinkFrequencyHz}
        />
        <Text style={styles.noticeText}>
          The slider sends `{formatFrequencyCommand(blinkFrequencyHz)}`.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Custom Command</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        editable={!sending}
        onChangeText={setCommandDraft}
        placeholder="Type a command for the ESP32"
        placeholderTextColor="#64748b"
        style={styles.input}
        value={commandDraft}
      />

      <Pressable
        style={[styles.primaryButton, (!canSendCommands || sending) && styles.commandButtonDisabled]}
        disabled={!canSendCommands || sending}
        onPress={() => void handleSendCommand(commandDraft)}>
        <Text style={styles.buttonText}>{sending ? 'Sending...' : 'Send Command'}</Text>
      </Pressable>

      {lastCommand && <Text style={styles.info}>Last command sent: {lastCommand}</Text>}

      <Pressable style={styles.secondaryButton} onPress={() => void handleDisconnect()}>
        <Text style={styles.buttonText}>Disconnect</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
    color: '#e2e8f0',
    fontSize: 18,
    marginBottom: 8,
  },
  meta: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 4,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 24,
  },
  info: {
    color: '#cbd5e1',
    fontSize: 16,
    marginBottom: 20,
    marginTop: 16,
  },
  noticeBox: {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
    padding: 16,
  },
  noticeTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  noticeText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  commandGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  commandButtonActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#93c5fd',
    borderWidth: 1,
  },
  input: {
    backgroundColor: '#1e1e1e',
    borderColor: '#334155',
    borderRadius: 12,
    borderWidth: 1,
    color: 'white',
    fontSize: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  secondaryButton: {
    backgroundColor: '#334155',
    borderRadius: 12,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  sliderCard: {
    backgroundColor: '#1e1e1e',
    borderColor: '#334155',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  sliderScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  commandButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  commandButtonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
