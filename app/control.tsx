import { Ionicons } from '@expo/vector-icons';
import { Canvas } from '@react-three/fiber/native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Suspense, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FrequencySlider } from '@/src/components/FrequencySlider';
import { TexturedVisioball } from '@/src/components/VisioballModel';
import { useBluetoothSession } from '@/src/hooks/useBluetoothSession';

const { width, height } = Dimensions.get('window');

// Peek strip height (above the safe area bottom inset)
const PEEK_HEIGHT = 72;
// Full expanded sheet height (from bottom of screen)
const SHEET_HEIGHT = height * 0.74;

function clamp(v: number, lo: number, hi: number) { return Math.min(Math.max(v, lo), hi); }

type TileProps = { color: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; sub: string; title: string };
function Tile({ color, icon, onPress, sub, title }: TileProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <View style={[styles.tileIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons color={color} name={icon} size={20} />
      </View>
      <View style={styles.tileText}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileSub}>{sub}</Text>
      </View>
      <Ionicons color="#4A5268" name="chevron-forward" size={16} />
    </Pressable>
  );
}

export default function ControlScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { canSendCommands, connectedDevice, disconnectFromBall, isConnected, sendCommandToBall } = useBluetoothSession();

  const [commandDraft, setCommandDraft] = useState('STATUS?');
  const [devPanelVisible, setDevPanelVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sending, setSending] = useState(false);
  const [sleepSending, setSleepSending] = useState(false);
  const [sleepMode, setSleepMode] = useState(false);
  const [volume, setVolume] = useState(57);
  const [lastCmd, setLastCmd] = useState<string | null>(null);
  const [ballRot, setBallRot] = useState({ x: 0, y: 0 });
  const [sheetOpen, setSheetOpen] = useState(false);

  const ballRotRef = useRef(ballRot);
  const panStartRef = useRef(ballRot);

  // Bottom inset — how tall the system nav bar is (0 on gesture nav, ~48dp on 3-button nav)
  // We add extra breathing room on top of the raw inset so the peek never sits flush against buttons
  const navBarHeight = insets.bottom;
  const SAFE_BOTTOM = navBarHeight + 16; // 16px breathing room above nav bar

  // Sheet travel distance: closed = show PEEK_HEIGHT above safe bottom
  const CLOSED_Y = SHEET_HEIGHT - PEEK_HEIGHT - SAFE_BOTTOM;

  const sheetY = useRef(new Animated.Value(CLOSED_Y)).current;

  const openSheet = () => {
    setSheetOpen(true);
    Animated.spring(sheetY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  };

  const closeSheet = () => {
    Animated.spring(sheetY, {
      toValue: CLOSED_Y,
      useNativeDriver: true,
      bounciness: 2,
      speed: 16,
    }).start(() => setSheetOpen(false));
  };

  // Bounce chevrons when collapsed
  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -7, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 340, easing: Easing.out(Easing.bounce), useNativeDriver: true }),
        Animated.delay(2200),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounceAnim]);

  // Sheet drag gesture — only responds to vertical drag on the handle area
  const dragStartY = useRef(0);
  const sheetDrag = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        dragStartY.current = (sheetY as any)._value ?? 0;
      },
      onPanResponderMove: (_, g) => {
        const next = clamp(dragStartY.current + g.dy, 0, CLOSED_Y);
        sheetY.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const cur = (sheetY as any)._value ?? 0;
        if (g.dy > 30 || cur > CLOSED_Y * 0.45) {
          closeSheet();
        } else {
          openSheet();
        }
      },
    })
  ).current;

  // Ball pan gesture
  const ballPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
    onPanResponderGrant: () => { panStartRef.current = ballRotRef.current; },
    onPanResponderMove: (_, g) => {
      const next = { x: clamp(panStartRef.current.x + g.dy / 140, -1.1, 1.1), y: panStartRef.current.y + g.dx / 110 };
      ballRotRef.current = next;
      setBallRot(next);
    },
  })).current;

  const deviceReady = isConnected && Boolean(connectedDevice);
  const cmdEnabled = deviceReady && canSendCommands && !sending;
  const suffix = connectedDevice?.id ? connectedDevice.id.slice(-2).toUpperCase() : '--';

  const sendCore = async (cmd: 'ON' | 'OFF') => {
    if (!deviceReady) { router.replace('/scan' as Href); return false; }
    if (!canSendCommands) { Alert.alert('Command unavailable', 'BLE channel not ready.'); return false; }
    try {
      setSending(true);
      await sendCommandToBall(cmd);
      setLastCmd(cmd);
      return true;
    } catch (e) {
      Alert.alert('Command failed', e instanceof Error ? e.message : 'Could not send.');
      return false;
    } finally { setSending(false); }
  };

  const handlePlay = async () => {
    const sent = await sendCore(isPlaying ? 'OFF' : 'ON');
    if (sent) setIsPlaying(!isPlaying);
  };

  const sendCustom = async () => {
    const cmd = commandDraft.trim();
    if (!cmd) { Alert.alert('Missing command', 'Enter a command first.'); return; }
    if (!cmdEnabled) { Alert.alert('Not connected', 'Connect to the ball first.'); return; }
    try {
      setSending(true);
      await sendCommandToBall(cmd);
      setLastCmd(cmd);
      Alert.alert('Sent', `"${cmd}" dispatched to the ball.`);
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Error.');
    } finally { setSending(false); }
  };

  const handleSleepModeToggle = async () => {
    const nextSleepMode = !sleepMode;

    if (!deviceReady) {
      router.replace('/scan' as Href);
      return;
    }

    if (!canSendCommands) {
      Alert.alert('Sleep unavailable', 'The BLE command channel is not ready yet.');
      return;
    }

    try {
      setSleepSending(true);

      const command = nextSleepMode ? 'SLEEP' : 'WAKE';
      await sendCommandToBall(command);
      setSleepMode(nextSleepMode);
      setLastCmd(command);
    } catch (e) {
      Alert.alert(
        'Sleep command failed',
        e instanceof Error ? e.message : 'Could not change the device sleep mode.'
      );
    } finally {
      setSleepSending(false);
    }
  };

  const handleDisconnect = async () => {
    setIsPlaying(false);
    closeSheet();
    setDevPanelVisible(false);
    router.replace('/scan' as Href);
    try { await disconnectFromBall(); } catch (e) {
      Alert.alert('Disconnect failed', e instanceof Error ? e.message : 'Error.');
    }
  };

  return (
    <View style={styles.screen}>
      {/* Push status bar content down on Android */}
      {Platform.OS === 'android' && <View style={{ height: StatusBar.currentHeight ?? 24 }} />}

      <View style={styles.topGlow} />

      {/* 3D Ball */}
      <View style={styles.ballStage}>
        <View {...ballPan.panHandlers} style={styles.canvasWrap}>
          <Suspense fallback={<ActivityIndicator color="#DC2626" size="large" />}>
            <Canvas camera={{ fov: 44, position: [0, 0, 6] }}>
              <ambientLight color="#ffffff" intensity={0.5} />
              <directionalLight color="#FF8888" intensity={2.2} position={[4, 5, 5]} />
              <directionalLight color="#FF4444" intensity={0.8} position={[-5, -2, 3]} />
              <TexturedVisioball rotationX={ballRot.x} rotationY={ballRot.y} />
            </Canvas>
          </Suspense>
        </View>
      </View>

      {/* Main scrollable content — padded so sheet peek never covers it */}
      <View style={[styles.content, { paddingBottom: PEEK_HEIGHT + SAFE_BOTTOM + 12 }]}>

        <View style={styles.statusRow}>
          <View style={[styles.statusChip, !deviceReady && styles.statusChipOff]}>
            <View style={[styles.statusDot, !deviceReady && styles.statusDotOff]} />
            <Text style={[styles.statusText, !deviceReady && styles.statusTextOff]}>
              {deviceReady ? 'Connected · Ready' : 'Disconnected'}
            </Text>
          </View>
          <Text style={styles.metaText}>{deviceReady ? '79% · BT 5.2' : 'Tap to scan'}</Text>
        </View>

        <View style={styles.volHeader}>
          <Text style={styles.sectionLabel}>VOLUME</Text>
          <Text style={styles.volVal}>{volume}%</Text>
        </View>
        <FrequencySlider minimumValue={0} maximumValue={100} step={1} value={volume} onValueChange={setVolume} />

        <View style={styles.transport}>
          <Pressable style={({ pressed }) => [styles.arrowBtn, pressed && styles.pressed]}>
            <Ionicons name="arrow-back" size={24} color="#F1F5FF" />
          </Pressable>
          <Pressable
            disabled={sending}
            onPress={() => void handlePlay()}
            style={({ pressed }) => [styles.playBtn, !deviceReady && styles.playBtnOff, pressed && styles.pressed]}
          >
            {sending
              ? <ActivityIndicator color="#080B14" />
              : <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color={deviceReady ? '#080B14' : '#F1F5FF'} style={!isPlaying && styles.playIconNudge} />
            }
          </Pressable>
          <Pressable style={({ pressed }) => [styles.arrowBtn, pressed && styles.pressed]}>
            <Ionicons name="arrow-forward" size={24} color="#F1F5FF" />
          </Pressable>
        </View>

        <View style={styles.divider} />

        <Pressable
          disabled={sleepSending}
          onPress={() => void handleSleepModeToggle()}
          style={({ pressed }) => [styles.sleepRow, pressed && styles.pressed, sleepSending && styles.disabledPressable]}>
          <View>
            <Text style={styles.sleepTitle}>Sleep mode</Text>
            <Text style={styles.sleepSub}>
              {sleepSending ? 'Updating device sleep state...' : 'Power save when idle'}
            </Text>
          </View>
          <View style={[styles.track, sleepMode && styles.trackOn]}>
            <View style={[styles.thumb, sleepMode && styles.thumbOn]} />
          </View>
        </Pressable>

        {!deviceReady && (
          <Pressable onPress={() => router.replace('/scan' as Href)} style={({ pressed }) => [styles.scanBtn, pressed && styles.pressed]}>
            <Ionicons name="scan" size={18} color="#080B14" />
            <Text style={styles.scanBtnText}>Scan for Ball</Text>
          </Pressable>
        )}
      </View>

      {/* Tap-away backdrop */}
      {sheetOpen && <Pressable style={styles.backdrop} onPress={closeSheet} />}

      {/* BOTTOM SHEET
          Positioned so its bottom edge accounts for the system nav bar.
          The sheet sits ABOVE the nav bar — never underneath it. */}
      <Animated.View
        style={[
          styles.sheet,
          {
            // Extra bottom padding inside sheet so content clears nav bar
            paddingBottom: SAFE_BOTTOM,
            // Sheet sits above nav bar
            bottom: navBarHeight,
            height: SHEET_HEIGHT,
          },
          { transform: [{ translateY: sheetY }] },
        ]}
      >
        {/* Draggable peek strip */}
        <View {...sheetDrag.panHandlers} style={styles.peekStrip}>
          {/* Bouncing chevrons — stop bouncing once open */}
          <Animated.View style={[
            styles.chevronsWrap,
            { transform: [{ translateY: sheetOpen ? 0 : bounceAnim }] },
          ]}>
            <Ionicons name="chevron-up" size={13} color="rgba(220,38,38,0.25)" style={styles.chevronBot} />
            <Ionicons name="chevron-up" size={13} color="rgba(220,38,38,0.55)" style={styles.chevronMid} />
            <Ionicons name="chevron-up" size={13} color="#DC2626" />
          </Animated.View>

          <Pressable onPress={sheetOpen ? closeSheet : openSheet} style={styles.peekCenter}>
            <View style={styles.handleBar} />
            <Text style={styles.peekLabel}>{sheetOpen ? 'Close menu' : 'Quick menu'}</Text>
          </Pressable>

          {/* Subtle indicator dot for open/closed state */}
          <View style={[styles.peekDot, sheetOpen && styles.peekDotOpen]} />
        </View>

        {/* Sheet scrollable content */}
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={sheetOpen}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Controls</Text>
            <Text style={styles.sheetSub}>CricTrack v2 · Device {suffix}</Text>
          </View>

          <Pressable
            onPress={() => { if (!deviceReady) { closeSheet(); router.replace('/scan' as Href); } }}
            style={({ pressed }) => [styles.deviceCard, pressed && styles.pressed]}
          >
            <View style={styles.deviceBall}>
              <View style={styles.deviceBallLine} />
            </View>
            <View style={styles.deviceCardText}>
              <Text style={styles.deviceCardTitle}>VisioBall</Text>
              <Text style={styles.deviceCardSub}>{deviceReady ? 'Connected · 79% battery' : 'Disconnected · tap to scan'}</Text>
            </View>
            <View style={[styles.deviceStatus, !deviceReady && styles.deviceStatusOff]} />
          </Pressable>

          <View style={styles.tilesGrid}>
            <Tile color="#22C55E" icon="musical-notes" sub="EQ · bass · mix"
              title="Audio" onPress={() => { closeSheet(); router.push('/sound' as Href); }} />
            <Tile color="#F59E0B" icon="locate" sub="Radar · GPS"
              title="Locate" onPress={() => { closeSheet(); router.push('/radar' as Href); }} />
            <Tile color="#DC2626" icon="settings" sub="Alerts · device"
              title="Settings" onPress={() => setDevPanelVisible(v => !v)} />
          </View>

          <Pressable
            disabled={sleepSending}
            onPress={() => void handleSleepModeToggle()}
            style={({ pressed }) => [styles.sheetSleepRow, pressed && styles.pressed, sleepSending && styles.disabledPressable]}>
            <Text style={styles.sheetSleepText}>Sleep mode</Text>
            <View style={[styles.track, sleepMode && styles.trackOn]}>
              <View style={[styles.thumb, sleepMode && styles.thumbOn]} />
            </View>
          </Pressable>

          {devPanelVisible && (
            <View style={styles.devPanel}>
              <View style={styles.devActions}>
                <Pressable onPress={() => { closeSheet(); setDevPanelVisible(false); router.replace('/scan' as Href); }}
                  style={({ pressed }) => [styles.devBtn, pressed && styles.pressed]}>
                  <Ionicons name="scan" size={18} color="#22C55E" />
                  <Text style={styles.devBtnText}>Scan</Text>
                </Pressable>
                <Pressable disabled={!deviceReady} onPress={() => void handleDisconnect()}
                  style={({ pressed }) => [styles.devBtn, !deviceReady && styles.devBtnDisabled, pressed && styles.pressed]}>
                  <Ionicons name="power" size={18} color="#22C55E" />
                  <Text style={styles.devBtnText}>Disconnect</Text>
                </Pressable>
              </View>
              <Text style={styles.devLabel}>Developer command</Text>
              <View style={styles.cmdRow}>
                <TextInput
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!sending}
                  onChangeText={setCommandDraft}
                  placeholder="STATUS?"
                  placeholderTextColor="#4A5268"
                  style={styles.cmdInput}
                  value={commandDraft}
                />
                <Pressable disabled={!cmdEnabled} onPress={() => void sendCustom()}
                  style={({ pressed }) => [styles.sendBtn, !cmdEnabled && styles.sendBtnDisabled, pressed && styles.pressed]}>
                  <Ionicons name="send" size={16} color="#080B14" />
                </Pressable>
              </View>
              {lastCmd && <Text style={styles.lastCmd}>Last: {lastCmd}</Text>}
            </View>
          )}

          <Text style={styles.footer}>Firmware v2.4.1 · Up to date</Text>
        </ScrollView>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080B14' },
  topGlow: { position: 'absolute', top: 30, left: '50%', marginLeft: -140, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(220,38,38,0.07)' },

  ballStage: { height: 300, alignItems: 'center', justifyContent: 'center' },
  canvasWrap: { width: Math.min(width, 390), height: 280 },

  content: { flex: 1, paddingHorizontal: 20 },

  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)', paddingHorizontal: 12, paddingVertical: 7 },
  statusChipOff: { backgroundColor: 'rgba(255,193,68,0.08)', borderColor: 'rgba(255,193,68,0.25)' },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  statusDotOff: { backgroundColor: '#F59E0B' },
  statusText: { color: '#22C55E', fontSize: 12, fontWeight: '800' },
  statusTextOff: { color: '#F59E0B' },
  metaText: { color: '#4A5268', fontSize: 11, fontWeight: '600' },

  sectionLabel: { color: '#4A5268', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  volHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  volVal: { color: '#8892A8', fontSize: 12, fontWeight: '700' },

  transport: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 22 },
  arrowBtn: { width: 52, height: 52, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 68, height: 68, borderRadius: 22, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', shadowColor: '#DC2626', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  playBtnOff: { backgroundColor: '#1C2238', shadowOpacity: 0 },
  playIconNudge: { marginLeft: 3 },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 20 },

  sleepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 16, paddingVertical: 14 },
  sleepTitle: { color: '#8892A8', fontSize: 15, fontWeight: '700' },
  sleepSub: { color: '#4A5268', fontSize: 12, fontWeight: '500', marginTop: 2 },

  track: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#1C2238', padding: 3 },
  trackOn: { backgroundColor: '#22C55E' },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#4A5268' },
  thumbOn: { backgroundColor: '#080B14', transform: [{ translateX: 20 }] },

  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 14, marginTop: 16 },
  scanBtnText: { color: '#080B14', fontSize: 15, fontWeight: '800' },

  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 10 },

  // Sheet — bottom is set dynamically in JSX to sit above nav bar
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#0F1220',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 24,
  },

  // Peek strip — full-width drag target at the top of the sheet
  peekStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },
  chevronsWrap: { alignItems: 'center', width: 20 },
  chevronBot: { marginBottom: -7 },
  chevronMid: { marginBottom: -7 },
  peekCenter: { flex: 1, alignItems: 'center', gap: 5 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  peekLabel: { color: '#4A5268', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  peekDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2A3050' },
  peekDotOpen: { backgroundColor: '#DC2626' },

  sheetScroll: { flex: 1 },
  sheetContent: { paddingHorizontal: 18, paddingBottom: 20 },
  sheetHeader: { marginBottom: 16 },
  sheetTitle: { color: '#F1F5FF', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  sheetSub: { color: '#4A5268', fontSize: 13, fontWeight: '500', marginTop: 4 },

  deviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161A2E', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  deviceBall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  deviceBallLine: { width: 42, height: 1, backgroundColor: 'rgba(255,255,255,0.3)', transform: [{ rotate: '6deg' }] },
  deviceCardText: { flex: 1, marginLeft: 12 },
  deviceCardTitle: { color: '#F1F5FF', fontSize: 16, fontWeight: '800' },
  deviceCardSub: { color: '#4A5268', fontSize: 13, fontWeight: '500', marginTop: 2 },
  deviceStatus: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E' },
  deviceStatusOff: { backgroundColor: '#F59E0B' },

  tilesGrid: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  tile: { flex: 1, backgroundColor: '#161A2E', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tileIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  tileText: { gap: 2 },
  tileTitle: { color: '#F1F5FF', fontSize: 13, fontWeight: '800' },
  tileSub: { color: '#4A5268', fontSize: 11, fontWeight: '500' },

  sheetSleepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4, marginBottom: 4 },
  sheetSleepText: { color: '#F1F5FF', fontSize: 18, fontWeight: '800' },

  devPanel: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 14, marginTop: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  devActions: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  devBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#161A2E', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingVertical: 12 },
  devBtnDisabled: { opacity: 0.4 },
  devBtnText: { color: '#F1F5FF', fontSize: 13, fontWeight: '700' },
  disabledPressable: { opacity: 0.55 },
  devLabel: { color: '#4A5268', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
  cmdRow: { flexDirection: 'row', gap: 10 },
  cmdInput: { flex: 1, backgroundColor: '#0F1220', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', color: '#F1F5FF', fontSize: 14, fontWeight: '600', paddingHorizontal: 14, paddingVertical: 11 },
  sendBtn: { width: 48, backgroundColor: '#22C55E', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  lastCmd: { color: '#22C55E', fontSize: 12, fontWeight: '600', marginTop: 10 },

  footer: { color: '#2A3050', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 20 },

  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});
