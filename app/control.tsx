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

type QuickControlTileProps = {
  accentColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  subtitle: string;
  title: string;
};

function QuickControlTile({
  accentColor,
  icon,
  onPress,
  subtitle,
  title,
}: QuickControlTileProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickControlTile, pressed && styles.pressed]}>
      <View style={[styles.quickControlIcon, { backgroundColor: `${accentColor}22` }]}>
        <Ionicons color={accentColor} name={icon} size={20} />
      </View>
      <Ionicons color="#7e8799" name="chevron-forward" size={18} style={styles.quickControlChevron} />
      <View style={styles.quickControlTextBlock}>
        <Text style={styles.quickControlTitle}>{title}</Text>
        <Text style={styles.quickControlSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function ControlScreen() {
  const router = useRouter();
  const { canSendCommands, connectedDevice, disconnectFromBall, isConnected, sendCommandToBall } =
    useBluetoothSession();

  const [commandDraft, setCommandDraft] = useState('STATUS?');
  const [developerPanelVisible, setDeveloperPanelVisible] = useState(false);
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
  const deviceSuffix = connectedDevice?.id ? connectedDevice.id.slice(-2).toUpperCase() : '--';

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
    setIsPlaying(false);
    setQuickMenuVisible(false);
    setDeveloperPanelVisible(false);
    router.replace('/scan' as Href);

    try {
      await disconnectFromBall();
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
            <Pressable
              onPress={() => {
                setQuickMenuVisible(false);
                setDeveloperPanelVisible(false);
              }}
              style={({ pressed }) => [styles.sheetTopButton, pressed && styles.pressed]}>
              <Ionicons color="#7e8799" name="arrow-down" size={20} />
            </Pressable>

            <View style={styles.quickControlsHeader}>
              <Text style={styles.sheetTitle}>Controls</Text>
              <Text style={styles.sheetSubtitle}>CricTrack v2 - Device {deviceSuffix}</Text>
            </View>

            <Pressable
              onPress={() => {
                if (!deviceReady) {
                  setQuickMenuVisible(false);
                  router.replace('/scan' as Href);
                }
              }}
              style={({ pressed }) => [styles.quickDeviceCard, pressed && styles.pressed]}>
              <View style={styles.quickBallIcon}>
                <View style={styles.quickBallLine} />
              </View>
              <View style={styles.quickDeviceTextBlock}>
                <Text style={styles.quickDeviceTitle}>VisioBall</Text>
                <Text style={styles.quickDeviceSubtitle}>
                  {deviceReady ? 'Connected - 79% battery' : 'Disconnected - tap to scan'}
                </Text>
              </View>
              <View style={[styles.quickDeviceDot, !deviceReady && styles.quickDeviceDotOffline]} />
            </Pressable>

            <View style={styles.quickControlsGrid}>
              <QuickControlTile
                accentColor="#15b7a5"
                icon="musical-notes"
                onPress={() => {
                  setQuickMenuVisible(false);
                  setDeveloperPanelVisible(false);
                  router.push('/sound' as Href);
                }}
                subtitle="EQ - bass - mix"
                title="Audio settings"
              />

              <QuickControlTile
                accentColor="#d76a15"
                icon="locate"
                onPress={() => {
                  setQuickMenuVisible(false);
                  setDeveloperPanelVisible(false);
                  router.push('/radar' as Href);
                }}
                subtitle="Radar - GPS"
                title="Locate ball"
              />

              <QuickControlTile
                accentColor="#c62f6c"
                icon="diamond"
                onPress={() => setDeveloperPanelVisible((current) => !current)}
                subtitle="Alerts - device"
                title="App settings"
              />
            </View>

            <Pressable
              onPress={() => setSleepMode((current) => !current)}
              style={({ pressed }) => [styles.quickSleepRow, pressed && styles.pressed]}>
              <Text style={styles.quickSleepText}>Sleep mode</Text>
              <View style={[styles.quickSwitchTrack, sleepMode && styles.quickSwitchTrackActive]}>
                <View style={[styles.quickSwitchThumb, sleepMode && styles.quickSwitchThumbActive]} />
              </View>
            </Pressable>

            {developerPanelVisible && (
              <View style={styles.settingsPanel}>
                <View style={styles.settingsActions}>
                  <Pressable
                    onPress={() => {
                      setQuickMenuVisible(false);
                      setDeveloperPanelVisible(false);
                      router.replace('/scan' as Href);
                    }}
                    style={({ pressed }) => [styles.settingsAction, pressed && styles.pressed]}>
                    <Ionicons color="#8fffc1" name="scan" size={20} />
                    <Text style={styles.settingsActionText}>Scan</Text>
                  </Pressable>

                  <Pressable
                    disabled={!deviceReady}
                    onPress={() => void handleDisconnect()}
                    style={({ pressed }) => [
                      styles.settingsAction,
                      !deviceReady && styles.menuButtonDisabled,
                      pressed && styles.pressed,
                    ]}>
                    <Ionicons color="#8fffc1" name="power" size={20} />
                    <Text style={styles.settingsActionText}>Disconnect</Text>
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
            )}

            <Text style={styles.quickFooter}>Firmware v2.4.1 - Up to date</Text>
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
    backgroundColor: '#10192a',
    borderColor: '#2b3852',
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
    color: '#7f8799',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 10,
    marginTop: 18,
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
  quickBallIcon: {
    alignItems: 'center',
    backgroundColor: '#ed4055',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 36,
  },
  quickBallLine: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    height: 1,
    transform: [{ rotate: '6deg' }],
    width: 42,
  },
  quickControlChevron: {
    position: 'absolute',
    right: 14,
    top: 24,
  },
  quickControlIcon: {
    alignItems: 'center',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  quickControlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickControlsHeader: {
    marginBottom: 12,
  },
  quickControlSubtitle: {
    color: '#9aa4b6',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  quickControlTextBlock: {
    bottom: 14,
    left: 14,
    position: 'absolute',
  },
  quickControlTile: {
    backgroundColor: '#1c273a',
    borderRadius: 18,
    height: 108,
    padding: 14,
    width: '47.5%',
  },
  quickControlTitle: {
    color: '#f7f8fb',
    fontSize: 16,
    fontWeight: '900',
  },
  quickDeviceCard: {
    alignItems: 'center',
    backgroundColor: '#151d30',
    borderRadius: 18,
    flexDirection: 'row',
    marginBottom: 20,
    minHeight: 64,
    paddingHorizontal: 14,
  },
  quickDeviceDot: {
    backgroundColor: '#30cf60',
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  quickDeviceDotOffline: {
    backgroundColor: '#e6a640',
  },
  quickDeviceSubtitle: {
    color: '#9aa4b6',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  quickDeviceTextBlock: {
    flex: 1,
    marginLeft: 14,
  },
  quickDeviceTitle: {
    color: '#f7f8fb',
    fontSize: 17,
    fontWeight: '900',
  },
  quickFooter: {
    color: '#8c95a8',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 28,
    textAlign: 'center',
  },
  quickSheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 20,
  },
  quickSleepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quickSleepText: {
    color: '#f7f8fb',
    fontSize: 20,
    fontWeight: '800',
  },
  quickSwitchThumb: {
    backgroundColor: '#f5f8ff',
    borderRadius: 999,
    height: 22,
    width: 22,
  },
  quickSwitchThumbActive: {
    transform: [{ translateX: 24 }],
  },
  quickSwitchTrack: {
    backgroundColor: '#253149',
    borderRadius: 999,
    padding: 3,
    width: 52,
  },
  quickSwitchTrackActive: {
    backgroundColor: '#2fcb6a',
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
  settingsAction: {
    alignItems: 'center',
    backgroundColor: '#172238',
    borderColor: '#2a3650',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  settingsActionText: {
    color: '#ececff',
    fontSize: 13,
    fontWeight: '800',
  },
  settingsActions: {
    flexDirection: 'row',
    gap: 10,
  },
  settingsPanel: {
    backgroundColor: 'rgba(15, 24, 40, 0.78)',
    borderColor: '#24314a',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 18,
    padding: 14,
  },
  sheetTopButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#22304a',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginBottom: 8,
    width: 36,
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
    color: '#9aa4b6',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  sheetTitle: {
    color: '#f7f8fb',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.6,
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
