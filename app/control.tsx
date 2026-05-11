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

  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

import { FrequencySlider } from '@/src/components/FrequencySlider';
import { BackgroundDust, TexturedVisioball } from '@/src/components/VisioballModel';
import { useBluetoothSession } from '@/src/hooks/useBluetoothSession';

const { width, height } = Dimensions.get('window');

// Peek strip height (above the safe area bottom inset)
const PEEK_HEIGHT = 48;
// Full expanded sheet height (from bottom of screen)
const SHEET_HEIGHT = height * 0.60;

function clamp(v: number, lo: number, hi: number) { return Math.min(Math.max(v, lo), hi); }

type TileProps = { color: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; sub: string; title: string };
function Tile({ color, icon, onPress, sub, title }: TileProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, { borderColor: `${color}50` }, pressed && styles.pressed]}>
      <View style={[styles.tileIconWrap, { backgroundColor: `${color}22` }]}>
        <Ionicons color={color} name={icon} size={28} />
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSub}>{sub}</Text>
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
  const glowY = useRef(new Animated.Value(0)).current;
  // canvas height / visible world height = pixel-per-unit scale for the hover axis
  const CANVAS_H = Math.min(width * 0.82, 320);
  const GLOW_SCALE = CANVAS_H / (2 * Math.tan((42 / 2) * (Math.PI / 180)) * 6.2);

  // Bottom inset — how tall the system nav bar is (0 on gesture nav, ~48dp on 3-button nav)
  // We add extra breathing room on top of the raw inset so the peek never sits flush against buttons
  const navBarHeight = insets.bottom;
  const SAFE_BOTTOM = navBarHeight + 16; // 16px breathing room above nav bar

  // Sheet travel distance: closed = show PEEK_HEIGHT above safe bottom
  const CLOSED_Y = SHEET_HEIGHT - PEEK_HEIGHT - SAFE_BOTTOM;

  const sheetY = useRef(new Animated.Value(CLOSED_Y)).current;
  const chevronRotate = useRef(new Animated.Value(0)).current;
  const chevronScale = useRef(new Animated.Value(1)).current;
  const chevronSpin = chevronRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const pulseThenSettle = () => Animated.sequence([
    Animated.spring(chevronScale, { toValue: 1.35, useNativeDriver: true, tension: 260, friction: 6 }),
    Animated.spring(chevronScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
  ]);

  const openSheet = () => {
    setSheetOpen(true);
    Animated.parallel([
      Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, tension: 58, friction: 13 }),
      Animated.spring(chevronRotate, { toValue: 1, useNativeDriver: true, tension: 130, friction: 8 }),
      pulseThenSettle(),
    ]).start();
  };

  const closeSheet = () => {
    setSheetOpen(false);
    Animated.parallel([
      Animated.spring(sheetY, { toValue: CLOSED_Y, useNativeDriver: true, tension: 72, friction: 18 }),
      Animated.spring(chevronRotate, { toValue: 0, useNativeDriver: true, tension: 130, friction: 8 }),
      pulseThenSettle(),
    ]).start();
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

  // Sheet drag — lives on the whole sheet
  const dragStartY = useRef(0);
  const sheetDrag = useRef(
    PanResponder.create({
      // Never pre-emptively claim touch start — lets taps reach Pressables
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) >= 6,
      onPanResponderGrant: () => {
        dragStartY.current = (sheetY as any)._value ?? 0;
      },
      onPanResponderMove: (_, g) => {
        const next = clamp(dragStartY.current + g.dy, 0, CLOSED_Y);
        sheetY.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const cur = (sheetY as any)._value ?? 0;
        // Fast swipe down closes instantly regardless of position
        if (g.vy > 0.4 || g.dy > 40 || cur > CLOSED_Y * 0.42) {
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
      <LinearGradient
        colors={['#142240', '#0F1A30', '#091121']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Push status bar content down on Android */}
      {Platform.OS === 'android' && <View style={{ height: StatusBar.currentHeight ?? 24 }} />}

      {/* 3D Ball */}
      <View style={styles.ballStage}>
        <Animated.View style={[styles.outerGlow, { transform: [{ translateY: glowY }] }]} />
        <Animated.View style={[styles.midGlow, { transform: [{ translateY: glowY }] }]} />
        <View {...ballPan.panHandlers} style={styles.canvasWrap}>
          <Suspense fallback={<ActivityIndicator color="#F05568" size="large" />}>
            <Canvas camera={{ fov: 42, position: [0, 0, 6.2] }}>
              <ambientLight color="#ffffff" intensity={0.8} />
              <directionalLight color="#ffffff" intensity={2.2} position={[6, 8, 8]} />
              <directionalLight color="#FF8A98" intensity={1.4} position={[-6, 4, 4]} />
              <directionalLight color="#4B1631" intensity={0.9} position={[0, -8, 5]} />
              <BackgroundDust />
              <TexturedVisioball
                rotationX={ballRot.x}
                rotationY={ballRot.y}
                onHoverOffset={(offset) => glowY.setValue(-offset * GLOW_SCALE)}
              />
            </Canvas>
          </Suspense>
        </View>
      </View>

      <View style={styles.stageSeparator} />

      {/* Main scrollable content — padded so sheet peek never covers it */}
      <View style={[styles.content, { paddingBottom: PEEK_HEIGHT + SAFE_BOTTOM + 12 }]}>

        <View style={styles.statusRow}>
          <View style={[styles.statusChip, !deviceReady && styles.statusChipOff]}>
            <View style={[styles.statusDot, !deviceReady && styles.statusDotOff]} />
            <Text style={[styles.statusText, !deviceReady && styles.statusTextOff]}>
              {deviceReady ? 'Connected · Ready' : 'Disconnected'}
            </Text>
          </View>
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
        {...sheetDrag.panHandlers}
        style={[
          styles.sheet,
          {
            paddingBottom: SAFE_BOTTOM,
            bottom: navBarHeight,
            height: SHEET_HEIGHT,
          },
          { transform: [{ translateY: sheetY }] },
        ]}
      >
        {/* Drag zone — visual only, no panHandlers needed here */}
        <View style={styles.dragZone}>
          <View style={styles.peekStrip}>
            <Animated.View style={[
              styles.chevronContainer,
              { transform: [
                { translateY: sheetOpen ? 0 : bounceAnim },
                { rotate: chevronSpin },
                { scale: chevronScale },
              ]},
            ]}>
              <Ionicons name="chevron-up" size={20} color="#A855F7" />
            </Animated.View>

            <Pressable onPress={sheetOpen ? closeSheet : openSheet} style={styles.peekCenter}>
              <View style={styles.handleBar} />
              <Text style={styles.peekLabel}>{sheetOpen ? 'Close menu' : 'Quick menu'}</Text>
            </Pressable>

            {/* Subtle indicator dot for open/closed state */}
            <View style={[styles.peekDot, sheetOpen && styles.peekDotOpen]} />
          </View>
        </View>

        {/* Sheet scrollable content */}
        <View style={[styles.sheetScroll, styles.sheetContent]}>
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
            <Tile color="#A855F7" icon="musical-notes" sub="EQ · bass · mix"
              title="Audio" onPress={() => { closeSheet(); router.push('/sound' as Href); }} />
            <Tile color="#60A5FA" icon="locate" sub="Radar · GPS"
              title="Locate" onPress={() => { closeSheet(); router.push('/radar' as Href); }} />
            <Tile color="#F472B6" icon="settings-sharp" sub="Alerts · device"
              title="Settings" onPress={() => { closeSheet(); router.push('/settings' as Href); }} />
          </View>

          <Pressable
            disabled={sleepSending}
            onPress={() => void handleSleepModeToggle()}
            style={({ pressed }) => [styles.sheetSleepRow, pressed && styles.pressed, sleepSending && styles.disabledPressable]}>
            <View>
              <Text style={styles.sheetSleepText}>Sleep mode</Text>
              <Text style={styles.sheetSleepSub}>{sleepSending ? 'Updating...' : 'Power save when idle'}</Text>
            </View>
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
        </View>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#091121' },

  outerGlow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(93,24,54,0.24)' },
  midGlow: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(143,32,62,0.22)' },

  ballStage: { height: Math.min(width * 0.88, 340), alignItems: 'center', justifyContent: 'center' },
  canvasWrap: { width: Math.min(width, 390), height: Math.min(width * 0.82, 320) },

  stageSeparator: { height: 1, backgroundColor: 'rgba(168,85,247,0.18)', marginHorizontal: 20 },
  content: { flex: 1, paddingHorizontal: 20 },

  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 20 },
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

  track: { width: 48, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', padding: 3 },
  trackOn: { backgroundColor: '#A855F7' },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#4A5568' },
  thumbOn: { backgroundColor: '#fff', transform: [{ translateX: 20 }] },

  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 14, marginTop: 16 },
  scanBtnText: { color: '#080B14', fontSize: 15, fontWeight: '800' },

  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 10 },

  // Sheet — bottom is set dynamically in JSX to sit above nav bar
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#0D1628',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 2,
    borderTopColor: 'rgba(168,85,247,0.75)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(168,85,247,0.28)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(168,85,247,0.28)',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 28,
  },

  // Large drag zone — the actual touch target (taller than the visual strip)
  dragZone: {
    width: '100%',
    minHeight: 80,
    justifyContent: 'center',
  },
  // Peek strip — visual only, lives inside dragZone
  peekStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },
  chevronContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 4,
  },
  peekCenter: { flex: 1, alignItems: 'center', gap: 6 },
  handleBar: { width: 44, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)' },
  peekLabel: { color: '#8A9BBF', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  peekDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E2A45' },
  peekDotOpen: { backgroundColor: '#A855F7' },

  sheetScroll: { flex: 1 },
  sheetContent: { paddingHorizontal: 18, paddingBottom: 20 },
  sheetHeader: { marginBottom: 18 },
  sheetTitle: { color: '#F4F7FF', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  sheetSub: { color: '#7A8CAE', fontSize: 13, fontWeight: '500', marginTop: 4 },

  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  deviceBall: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  deviceBallLine: { width: 48, height: 1, backgroundColor: 'rgba(255,255,255,0.3)', transform: [{ rotate: '6deg' }] },
  deviceCardText: { flex: 1, marginLeft: 13 },
  deviceCardTitle: { color: '#F4F7FF', fontSize: 16, fontWeight: '800' },
  deviceCardSub: { color: '#7A8CAE', fontSize: 12, fontWeight: '500', marginTop: 2 },
  deviceStatus: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E' },
  deviceStatusOff: { backgroundColor: '#F59E0B' },

  tilesGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 14,
    paddingBottom: 16,
    borderWidth: 1,
    gap: 12,
  },
  tileIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { color: '#F4F7FF', fontSize: 14, fontWeight: '800' },
  tileSub: { color: '#7A8CAE', fontSize: 11, fontWeight: '500' },

  sheetSleepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sheetSleepText: { color: '#F4F7FF', fontSize: 15, fontWeight: '800' },
  sheetSleepSub: { color: '#7A8CAE', fontSize: 12, fontWeight: '500', marginTop: 2 },

  devPanel: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 14, marginTop: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  devActions: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  devBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', paddingVertical: 12 },
  devBtnDisabled: { opacity: 0.4 },
  devBtnText: { color: '#F4F7FF', fontSize: 13, fontWeight: '700' },
  disabledPressable: { opacity: 0.55 },
  devLabel: { color: '#7A8CAE', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
  cmdRow: { flexDirection: 'row', gap: 10 },
  cmdInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', color: '#F4F7FF', fontSize: 14, fontWeight: '600', paddingHorizontal: 14, paddingVertical: 11 },
  sendBtn: { width: 48, backgroundColor: '#A855F7', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  lastCmd: { color: '#A855F7', fontSize: 12, fontWeight: '600', marginTop: 10 },

  footer: { color: '#2A3050', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 20 },

  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});
