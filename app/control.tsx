import { Ionicons } from '@expo/vector-icons';
import { Canvas } from '@react-three/fiber/native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Suspense, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FrequencySlider } from '@/src/components/FrequencySlider';
import { TexturedVisioball } from '@/src/components/VisioballModel';
import { useBluetoothSession } from '@/src/hooks/useBluetoothSession';

const { width } = Dimensions.get('window');

const DEFAULT_VOLUME = 57;

function clamp(value: number, minimumValue: number, maximumValue: number) {
  return Math.min(Math.max(value, minimumValue), maximumValue);
}

export default function ControlScreen() {
  const router = useRouter();
  const { canSendCommands, connectedDevice, disconnectFromBall, isConnected, sendCommandToBall } =
    useBluetoothSession();

  const [commandDraft, setCommandDraft] = useState('STATUS?');
  const [isPlaying, setIsPlaying] = useState(false);
  const [quickMenuVisible, setQuickMenuVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [sleepMode, setSleepMode] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [ballRotation, setBallRotation] = useState({ x: 0, y: 0 });
  const ballRotationRef = useRef(ballRotation);
  const panStartRotationRef = useRef(ballRotation);

  const ballPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gestureState) =>
        Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
      onPanResponderGrant: () => {
        panStartRotationRef.current = ballRotationRef.current;
      },
      onPanResponderMove: (_event, gestureState) => {
        const nextRotation = {
          x: clamp(panStartRotationRef.current.x + gestureState.dy / 140, -1.1, 1.1),
          y: panStartRotationRef.current.y + gestureState.dx / 110,
        };

        ballRotationRef.current = nextRotation;
        setBallRotation(nextRotation);
      },
      onStartShouldSetPanResponder: () => true,
    })
  ).current;

  const deviceReady = isConnected && Boolean(connectedDevice);
  const commandEnabled = deviceReady && canSendCommands && !sending;

  const sendCoreCommand = async (command: 'ON' | 'OFF') => {
    if (!deviceReady) {
      router.replace('/scan' as Href);
      return false;
    }

    if (!canSendCommands) {
      Alert.alert('Command unavailable', 'The BLE command channel is not ready yet.');
      return false;
    }

    try {
      setSending(true);
      await sendCommandToBall(command);
      setLastCommand(command);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send the command.';
      Alert.alert('Command failed', message);
      return false;
    } finally {
      setSending(false);
    }
  };

  const handleTogglePlayback = async () => {
    const nextCommand = isPlaying ? 'OFF' : 'ON';
    const sent = await sendCoreCommand(nextCommand);

    if (sent) {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSendCustomCommand = async () => {
    const trimmedCommand = commandDraft.trim();

    if (!trimmedCommand) {
      Alert.alert('Missing command', 'Enter a command before sending.');
      return;
    }

    if (!commandEnabled) {
      Alert.alert('Command unavailable', 'Connect to the ball before sending developer commands.');
      return;
    }

    try {
      setSending(true);
      await sendCommandToBall(trimmedCommand);
      setLastCommand(trimmedCommand);
      Alert.alert('Command sent', `Sent "${trimmedCommand}" to the ball.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send the command.';
      Alert.alert('Command failed', message);
    } finally {
      setSending(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectFromBall();
      setIsPlaying(false);
      setQuickMenuVisible(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not disconnect from the device.';

      Alert.alert('Disconnect failed', message);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topGlow} />
      <View style={styles.ballStage}>
        <View {...ballPanResponder.panHandlers} style={styles.canvasWrap}>
          <Suspense fallback={<ActivityIndicator color="#8fffc1" size="large" />}>
            <Canvas camera={{ fov: 44, position: [0, 0, 6] }}>
              <ambientLight color="#ffffff" intensity={0.48} />
              <directionalLight color="#ffced8" intensity={2.1} position={[4, 5, 5]} />
              <directionalLight color="#77f7b2" intensity={0.6} position={[-5, -2, 3]} />
              <TexturedVisioball rotationX={ballRotation.x} rotationY={ballRotation.y} />
            </Canvas>
          </Suspense>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.statusRow}>
          <View style={[styles.statusChip, !deviceReady && styles.statusChipOffline]}>
            <View style={[styles.statusDot, !deviceReady && styles.statusDotOffline]} />
            <Text style={[styles.statusText, !deviceReady && styles.statusTextOffline]}>
              {deviceReady ? 'Connected · Ready' : 'Disconnected'}
            </Text>
          </View>

          <Text style={styles.batteryText}>
            {deviceReady ? '79% · Bluetooth 5.2' : 'Scan to connect'}
          </Text>
        </View>

        <View style={styles.volumeHeader}>
          <Text style={styles.label}>Volume</Text>
          <Text style={styles.volumeValue}>{volume}%</Text>
        </View>
        <FrequencySlider
          maximumValue={100}
          minimumValue={0}
          onValueChange={setVolume}
          step={1}
          value={volume}
        />
        <Text style={styles.helperText}>Volume is local UI only until the ESP supports VOL commands.</Text>

        <View style={styles.transportRow}>
          <Pressable style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}>
            <Ionicons color="#f7f7ff" name="arrow-back" size={28} />
          </Pressable>

          <Pressable
            disabled={sending}
            onPress={() => void handleTogglePlayback()}
            style={({ pressed }) => [
              styles.playButton,
              !deviceReady && styles.playButtonDisconnected,
              pressed && styles.pressed,
            ]}>
            <Ionicons
              color="#fafff6"
              name={isPlaying ? 'pause' : 'play'}
              size={34}
              style={!isPlaying && styles.playIcon}
            />
          </Pressable>

          <Pressable style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}>
            <Ionicons color="#f7f7ff" name="arrow-forward" size={28} />
          </Pressable>
        </View>

        <View style={styles.divider} />

        <Pressable
          onPress={() => setSleepMode((current) => !current)}
          style={({ pressed }) => [styles.sleepCard, pressed && styles.pressed]}>
          <View>
            <Text style={styles.sleepTitle}>Sleep mode</Text>
            <Text style={styles.sleepSubtitle}>Power save when idle</Text>
          </View>
          <View style={[styles.switchTrack, sleepMode && styles.switchTrackActive]}>
            <View style={[styles.switchThumb, sleepMode && styles.switchThumbActive]} />
          </View>
        </Pressable>

        {!deviceReady && (
          <Pressable
            onPress={() => router.replace('/scan' as Href)}
            style={({ pressed }) => [styles.scanButton, pressed && styles.pressed]}>
            <Ionicons color="#06150f" name="scan" size={20} />
            <Text style={styles.scanButtonText}>Scan for Ball</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => setQuickMenuVisible(true)}
          style={({ pressed }) => [styles.quickMenuCard, pressed && styles.pressed]}>
          <View style={styles.quickIcon}>
            <Ionicons color="#f8f8ff" name="arrow-up" size={28} />
          </View>
          <Text style={styles.quickMenuText}>Open quick menu</Text>
        </Pressable>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setQuickMenuVisible(false)}
        transparent
        visible={quickMenuVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.quickSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Quick menu</Text>
                <Text style={styles.sheetSubtitle}>
                  {connectedDevice?.name ?? 'No ball connected'}
                </Text>
              </View>
              <Pressable onPress={() => setQuickMenuVisible(false)} style={styles.closeButton}>
                <Ionicons color="#9ca3af" name="close" size={22} />
              </Pressable>
            </View>

            <View style={styles.menuGrid}>
              <Pressable
                onPress={() => {
                  setQuickMenuVisible(false);
                  router.replace('/scan' as Href);
                }}
                style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}>
                <Ionicons color="#8fffc1" name="scan" size={24} />
                <Text style={styles.menuButtonText}>Scan</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setQuickMenuVisible(false);
                  router.push('/sound' as Href);
                }}
                style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}>
                <Ionicons color="#8fffc1" name="musical-notes" size={24} />
                <Text style={styles.menuButtonText}>Sound</Text>
              </Pressable>

              <Pressable
                disabled={!deviceReady}
                onPress={() => void handleDisconnect()}
                style={({ pressed }) => [
                  styles.menuButton,
                  !deviceReady && styles.menuButtonDisabled,
                  pressed && styles.pressed,
                ]}>
                <Ionicons color="#8fffc1" name="power" size={24} />
                <Text style={styles.menuButtonText}>Disconnect</Text>
              </Pressable>
            </View>

            <Text style={styles.devLabel}>Developer command</Text>
            <View style={styles.commandRow}>
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!sending}
                onChangeText={setCommandDraft}
                placeholder="STATUS?"
                placeholderTextColor="#6b7280"
                style={styles.commandInput}
                value={commandDraft}
              />
              <Pressable
                disabled={!commandEnabled}
                onPress={() => void handleSendCustomCommand()}
                style={({ pressed }) => [
                  styles.sendButton,
                  !commandEnabled && styles.sendButtonDisabled,
                  pressed && styles.pressed,
                ]}>
                <Ionicons color="#05100b" name="send" size={18} />
              </Pressable>
            </View>

            {lastCommand && <Text style={styles.lastCommand}>Last command: {lastCommand}</Text>}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  arrowButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  ballStage: {
    alignItems: 'center',
    height: 360,
    justifyContent: 'center',
    paddingTop: 28,
  },
  batteryText: {
    color: '#777288',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  canvasWrap: {
    height: 310,
    width: Math.min(width, 390),
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#262637',
    borderRadius: 16,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  commandInput: {
    backgroundColor: '#171724',
    borderColor: '#303044',
    borderRadius: 16,
    borderWidth: 1,
    color: '#ffffff',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  commandRow: {
    flexDirection: 'row',
    gap: 10,
  },
  content: {
    flex: 1,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  devLabel: {
    color: '#777288',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 10,
    marginTop: 24,
    textTransform: 'uppercase',
  },
  divider: {
    backgroundColor: '#202030',
    height: 1,
    marginBottom: 24,
    marginTop: 26,
  },
  helperText: {
    color: '#625d74',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  label: {
    color: '#777288',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  lastCommand: {
    color: '#8fffc1',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 14,
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: '#191927',
    borderColor: '#303044',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    paddingVertical: 16,
  },
  menuButtonDisabled: {
    opacity: 0.45,
  },
  menuButtonText: {
    color: '#ececff',
    fontSize: 13,
    fontWeight: '800',
  },
  menuGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  playButton: {
    alignItems: 'center',
    backgroundColor: '#35c982',
    borderColor: '#c8ffe0',
    borderRadius: 0,
    borderWidth: 2,
    height: 66,
    justifyContent: 'center',
    shadowColor: '#8fffc1',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 18,
    width: 66,
  },
  playButtonDisconnected: {
    backgroundColor: '#65606f',
    borderColor: '#8c849d',
    shadowOpacity: 0.15,
  },
  playIcon: {
    marginLeft: 4,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  quickIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 999,
    height: 46,
    justifyContent: 'center',
    marginBottom: 12,
    width: 46,
  },
  quickMenuCard: {
    alignItems: 'center',
    backgroundColor: '#232331',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 42,
    minHeight: 136,
    padding: 22,
  },
  quickMenuText: {
    color: '#9b98aa',
    fontSize: 14,
    fontWeight: '800',
  },
  quickSheet: {
    backgroundColor: '#10101a',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    padding: 22,
    paddingBottom: 34,
  },
  scanButton: {
    alignItems: 'center',
    backgroundColor: '#8fffc1',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 15,
  },
  scanButtonText: {
    color: '#06150f',
    fontSize: 16,
    fontWeight: '900',
  },
  screen: {
    backgroundColor: '#0b081a',
    flex: 1,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#8fffc1',
    borderRadius: 16,
    justifyContent: 'center',
    width: 52,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#35354a',
    borderRadius: 999,
    height: 5,
    marginBottom: 22,
    width: 46,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  sheetSubtitle: {
    color: '#777288',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  sheetTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  sleepCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  sleepSubtitle: {
    color: '#656073',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  sleepTitle: {
    color: '#9d98aa',
    fontSize: 16,
    fontWeight: '800',
  },
  statusChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(80, 255, 160, 0.08)',
    borderColor: 'rgba(143, 255, 193, 0.28)',
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipOffline: {
    backgroundColor: 'rgba(255, 193, 104, 0.08)',
    borderColor: 'rgba(255, 193, 104, 0.28)',
  },
  statusDot: {
    backgroundColor: '#8fffc1',
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  statusDotOffline: {
    backgroundColor: '#ffc168',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statusText: {
    color: '#8fffc1',
    fontSize: 13,
    fontWeight: '800',
  },
  statusTextOffline: {
    color: '#ffc168',
  },
  switchThumb: {
    backgroundColor: '#6d687a',
    borderRadius: 999,
    height: 22,
    width: 22,
  },
  switchThumbActive: {
    backgroundColor: '#09150f',
    transform: [{ translateX: 22 }],
  },
  switchTrack: {
    backgroundColor: '#343341',
    borderRadius: 999,
    padding: 3,
    width: 50,
  },
  switchTrackActive: {
    backgroundColor: '#8fffc1',
  },
  topGlow: {
    backgroundColor: '#2b0d38',
    borderRadius: 180,
    height: 220,
    left: width / 2 - 135,
    opacity: 0.28,
    position: 'absolute',
    top: 42,
    width: 270,
  },
  transportRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginTop: 26,
  },
  volumeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  volumeValue: {
    color: '#8b879b',
    fontSize: 12,
    fontWeight: '900',
  },
});
