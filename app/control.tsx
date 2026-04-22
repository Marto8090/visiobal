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
  const { canSendCommands, connectedDevice, disconnectFromBall, isConnected, sendCommandToBall } = useBluetoothSession();

  const [commandDraft, setCommandDraft] = useState('STATUS?');
  const [devPanelVisible, setDevPanelVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [quickMenuVisible, setQuickMenuVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [sleepMode, setSleepMode] = useState(false);
  const [volume, setVolume] = useState(57);
  const [lastCmd, setLastCmd] = useState<string | null>(null);
  const [ballRot, setBallRot] = useState({ x: 0, y: 0 });
  const ballRotRef = useRef(ballRot);
  const panStartRef = useRef(ballRot);

  // Stacked chevrons bounce up then snap back with bounce easing — hints tap/swipe up
  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 460,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.bounce),
          useNativeDriver: true,
        }),
        Animated.delay(1800),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounceAnim]);

  const pan = useRef(PanResponder.create({
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

  const handleDisconnect = async () => {
    setIsPlaying(false); setQuickMenuVisible(false); setDevPanelVisible(false);
    router.replace('/scan' as Href);
    try { await disconnectFromBall(); } catch (e) { Alert.alert('Disconnect failed', e instanceof Error ? e.message : 'Error.'); }
  };

  return (
    <View style={styles.screen}>

      <View style={styles.topGlow} />

      {/* 3D Ball */}
      <View style={styles.ballStage}>
        <View {...pan.panHandlers} style={styles.canvasWrap}>
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

      {/* Main content */}
      <View style={styles.content}>

        {/* Status */}
        <View style={styles.statusRow}>
          <View style={[styles.statusChip, !deviceReady && styles.statusChipOff]}>
            <View style={[styles.statusDot, !deviceReady && styles.statusDotOff]} />
            <Text style={[styles.statusText, !deviceReady && styles.statusTextOff]}>
              {deviceReady ? 'Connected · Ready' : 'Disconnected'}
            </Text>
          </View>
          <Text style={styles.metaText}>{deviceReady ? '79% · BT 5.2' : 'Tap to scan'}</Text>
        </View>

        {/* Volume */}
        <View style={styles.volHeader}>
          <Text style={styles.sectionLabel}>VOLUME</Text>
          <Text style={styles.volVal}>{volume}%</Text>
        </View>
        <FrequencySlider minimumValue={0} maximumValue={100} step={1} value={volume} onValueChange={setVolume} />

        {/* Transport */}
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

        {/* Sleep */}
        <Pressable onPress={() => setSleepMode(v => !v)} style={({ pressed }) => [styles.sleepRow, pressed && styles.pressed]}>
          <View>
            <Text style={styles.sleepTitle}>Sleep mode</Text>
            <Text style={styles.sleepSub}>Power save when idle</Text>
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

        {/* Quick menu card — three stacked chevrons bounce up to hint interaction */}
        <Pressable onPress={() => setQuickMenuVisible(true)} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
          <Animated.View style={[styles.chevronsWrap, { transform: [{ translateY: bounceAnim }] }]}>
            <Ionicons name="chevron-up" size={15} color="rgba(220,38,38,0.28)" style={styles.chevronBot} />
            <Ionicons name="chevron-up" size={15} color="rgba(220,38,38,0.58)" style={styles.chevronMid} />
            <Ionicons name="chevron-up" size={15} color="#DC2626" />
          </Animated.View>
          <Text style={styles.quickCardText}>Open quick menu</Text>
        </Pressable>

      </View>

      {/* QUICK MENU MODAL */}
      <Modal visible={quickMenuVisible} animationType="slide" transparent onRequestClose={() => setQuickMenuVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>

            <Pressable onPress={() => { setQuickMenuVisible(false); setDevPanelVisible(false); }} style={({ pressed }) => [styles.sheetHandle, pressed && styles.pressed]}>
              <View style={styles.handleBar} />
            </Pressable>

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Controls</Text>
              <Text style={styles.sheetSub}>CricTrack v2 · Device {suffix}</Text>
            </View>

            {/* Device card */}
            <Pressable
              onPress={() => { if (!deviceReady) { setQuickMenuVisible(false); router.replace('/scan' as Href); } }}
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

            {/* Tiles */}
            <View style={styles.tilesGrid}>
              <Tile color="#22C55E" icon="musical-notes" sub="EQ · bass · mix"
                title="Audio" onPress={() => { setQuickMenuVisible(false); setDevPanelVisible(false); router.push('/sound' as Href); }} />
              <Tile color="#F59E0B" icon="locate" sub="Radar · GPS"
                title="Locate" onPress={() => { setQuickMenuVisible(false); setDevPanelVisible(false); router.push('/radar' as Href); }} />
              <Tile color="#DC2626" icon="settings" sub="Alerts · device"
                title="Settings" onPress={() => setDevPanelVisible(v => !v)} />
            </View>

            {/* Sleep toggle */}
            <Pressable onPress={() => setSleepMode(v => !v)} style={({ pressed }) => [styles.sheetSleepRow, pressed && styles.pressed]}>
              <Text style={styles.sheetSleepText}>Sleep mode</Text>
              <View style={[styles.track, sleepMode && styles.trackOn]}>
                <View style={[styles.thumb, sleepMode && styles.thumbOn]} />
              </View>
            </Pressable>

            {/* Developer panel */}
            {devPanelVisible && (
              <View style={styles.devPanel}>
                <View style={styles.devActions}>
                  <Pressable onPress={() => { setQuickMenuVisible(false); setDevPanelVisible(false); router.replace('/scan' as Href); }}
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
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080B14' },
  topGlow: { position: 'absolute', top: 30, left: '50%', marginLeft: -140, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(220,38,38,0.07)' },

  ballStage: { height: 340, alignItems: 'center', justifyContent: 'center' },
  canvasWrap: { width: Math.min(width, 390), height: 300 },

  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },

  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
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

  transport: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 24 },
  arrowBtn: { width: 52, height: 52, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 68, height: 68, borderRadius: 22, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', shadowColor: '#DC2626', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  playBtnOff: { backgroundColor: '#1C2238', shadowOpacity: 0 },
  playIconNudge: { marginLeft: 3 },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 22 },

  sleepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 16, paddingVertical: 14 },
  sleepTitle: { color: '#8892A8', fontSize: 15, fontWeight: '700' },
  sleepSub: { color: '#4A5268', fontSize: 12, fontWeight: '500', marginTop: 2 },

  track: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#1C2238', padding: 3 },
  trackOn: { backgroundColor: '#22C55E' },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#4A5268' },
  thumbOn: { backgroundColor: '#080B14', transform: [{ translateX: 20 }] },

  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 14, marginTop: 16 },
  scanBtnText: { color: '#080B14', fontSize: 15, fontWeight: '800' },

  // Quick menu card
  quickCard: { alignItems: 'center', backgroundColor: '#0F1220', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginTop: 16, paddingVertical: 16, gap: 8 },
  chevronsWrap: { flexDirection: 'column', alignItems: 'center', gap: -4 },
  chevronBot: { marginBottom: -8 },
  chevronMid: { marginBottom: -8 },
  quickCardText: { color: '#4A5268', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  // Modal
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: '#0F1220', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingBottom: 36, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  sheetHandle: { alignItems: 'center', paddingVertical: 14 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  sheetHeader: { marginBottom: 16 },
  sheetTitle: { color: '#F1F5FF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  sheetSub: { color: '#4A5268', fontSize: 13, fontWeight: '500', marginTop: 4 },

  deviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161A2E', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  deviceBall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  deviceBallLine: { width: 42, height: 1, backgroundColor: 'rgba(255,255,255,0.3)', transform: [{ rotate: '6deg' }] },
  deviceCardText: { flex: 1, marginLeft: 12 },
  deviceCardTitle: { color: '#F1F5FF', fontSize: 16, fontWeight: '800' },
  deviceCardSub: { color: '#4A5268', fontSize: 13, fontWeight: '500', marginTop: 2 },
  deviceStatus: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E' },
  deviceStatusOff: { backgroundColor: '#F59E0B' },

  tilesGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
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
  devLabel: { color: '#4A5268', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
  cmdRow: { flexDirection: 'row', gap: 10 },
  cmdInput: { flex: 1, backgroundColor: '#0F1220', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', color: '#F1F5FF', fontSize: 14, fontWeight: '600', paddingHorizontal: 14, paddingVertical: 11 },
  sendBtn: { width: 48, backgroundColor: '#22C55E', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  lastCmd: { color: '#22C55E', fontSize: 12, fontWeight: '600', marginTop: 10 },

  footer: { color: '#2A3050', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 20 },

  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});