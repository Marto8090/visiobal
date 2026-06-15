import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { Canvas } from '@react-three/fiber/native';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  InteractionManager,
  PanResponder,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

import { FrequencySlider } from '@/src/components/FrequencySlider';
import { BackgroundDust, TexturedVisioball } from '@/src/components/VisioballModel';
import { useI18n } from '@/src/context/I18nContext';
import { TRACKS, usePlayerState } from '@/src/context/PlayerContext';
import { ThemeColors, useTheme } from '@/src/context/ThemeContext';
import { useBluetoothSession } from '@/src/hooks/useBluetoothSession';
import { configureThreeNativeRenderer } from '@/src/utils/configureThreeNativeRenderer';

const { width, height } = Dimensions.get('window');
const VOLUME_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const PEEK_HEIGHT = 43;
const CONTROLS_MENU_HEIGHT_OFFSET = 1;
const SHEET_HEIGHT = height * 0.525 - CONTROLS_MENU_HEIGHT_OFFSET;

function clamp(v: number, lo: number, hi: number) { return Math.min(Math.max(v, lo), hi); }

function batteryColor(level: number) {
  if (level >= 60) return '#22C55E';
  if (level >= 30) return '#F59E0B';
  return '#DC2626';
}

function batteryIconName(level: number): keyof typeof Ionicons.glyphMap {
  if (level >= 60) return 'battery-full-outline';
  if (level >= 30) return 'battery-half-outline';
  return 'battery-dead-outline';
}

function makeStyles(theme: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.bgDeep },
    ballStage: { height: Math.min(width * 0.88, 340), alignItems: 'center', justifyContent: 'center' },
    canvasWrap: { width: Math.min(width, 390), height: Math.min(width * 0.82, 320) },
    stageSeparator: { height: 1, backgroundColor: 'rgba(168,85,247,0.18)', marginHorizontal: 20 },
    content: { flex: 1, paddingHorizontal: 20 },
    statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 20 },
    statusChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)', paddingHorizontal: 12, paddingVertical: 7 },
    statusChipOff: { backgroundColor: isDark ? 'rgba(255,193,68,0.08)' : 'rgba(100,120,200,0.08)', borderColor: isDark ? 'rgba(255,193,68,0.25)' : 'rgba(100,120,200,0.22)' },
    statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
    statusDotOff: { backgroundColor: isDark ? '#F59E0B' : '#6B80CC' },
    statusText: { color: '#22C55E', fontSize: 12, fontWeight: '800' },
    statusTextOff: { color: isDark ? '#F59E0B' : '#5A6FA0' },
    sectionLabel: { color: theme.textSubtle, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
    volHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    volVal: { color: '#A855F7', fontSize: 12, fontWeight: '900' },
    ticksRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 },
    tickItem: { alignItems: 'center', gap: 3 },
    tickDot: { width: 3, height: 5, borderRadius: 1.5, backgroundColor: theme.tickInactive },
    tickDotActive: { backgroundColor: '#A855F7' },
    tickLabel: { color: theme.tickLabel, fontSize: 8, fontWeight: '700' },
    tickLabelActive: { color: '#A855F7' },
    transport: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginTop: 20 },
    ctrlSkipBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    playBtn: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#A855F7', alignItems: 'center', justifyContent: 'center', shadowColor: '#A855F7', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
    playBtnOff: { backgroundColor: theme.bgDeep, shadowOpacity: 0 },
    playIconNudge: { marginLeft: 3 },
    scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 14, marginTop: 16 },
    scanBtnText: { color: '#080B14', fontSize: 15, fontWeight: '800' },
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', zIndex: 10 },
    sheet: {
      position: 'absolute', left: 0, right: 0,
      backgroundColor: theme.cardAlt,
      borderTopLeftRadius: 30, borderTopRightRadius: 30,
      borderTopWidth: 2, borderTopColor: 'rgba(168,85,247,0.75)',
      borderLeftWidth: 1, borderLeftColor: 'rgba(168,85,247,0.28)',
      borderRightWidth: 1, borderRightColor: 'rgba(168,85,247,0.28)',
      zIndex: 20,
      shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 28,
    },
    dragZone: { width: '100%', minHeight: 80, justifyContent: 'center' },
    peekStrip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 10 },
    chevronContainer: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', shadowColor: '#A855F7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 10 },
    peekCenter: { flex: 1, alignItems: 'center', gap: 6 },
    handleBar: { width: 44, height: 4, borderRadius: 2, backgroundColor: theme.handleBar },
    peekLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    peekDotSlot: { width: 36, height: 36, alignItems: 'flex-end', justifyContent: 'center' },
    peekDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.bgDeep },
    peekDotOpen: { backgroundColor: '#A855F7' },
    sheetScroll: { flex: 1 },
    sheetContent: { paddingHorizontal: 18, paddingBottom: 20 },
    sheetHeader: { marginBottom: 18 },
    sheetTitle: { color: theme.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    sheetSub: { color: theme.textMuted, fontSize: 13, fontWeight: '500', marginTop: 4 },
    tilesGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    tile: { flex: 1, backgroundColor: theme.card, borderRadius: 20, padding: 14, paddingBottom: 16, borderWidth: 1, gap: 12 },
    tileIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    tileTitle: { color: theme.text, fontSize: 14, fontWeight: '800' },
    tileSub: { color: theme.textMuted, fontSize: 11, fontWeight: '500' },
    sheetSleepRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: theme.card, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16,
      marginBottom: 4, borderWidth: 1, borderColor: theme.border,
    },
    sheetSleepText: { color: theme.text, fontSize: 15, fontWeight: '800' },
    sheetSleepSub: { color: theme.textMuted, fontSize: 12, fontWeight: '500', marginTop: 2 },
    disconnectRow: {
      alignItems: 'center',
      backgroundColor: 'rgba(239,68,68,0.10)',
      borderColor: 'rgba(239,68,68,0.28)',
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'center',
      marginTop: 28,
      paddingHorizontal: 16,
      paddingVertical: 14,
      width: '100%',
    },
    disconnectText: { color: '#EF4444', fontSize: 15, fontWeight: '800' },
    track: { width: 48, height: 28, borderRadius: 14, backgroundColor: theme.tickInactive, padding: 3 },
    trackOn: { backgroundColor: '#A855F7' },
    thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.textSubtle },
    thumbOn: { backgroundColor: '#fff', transform: [{ translateX: 20 }] },
    disabledPressable: { opacity: 0.55 },
    footer: { color: theme.textSubtle, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 20 },
    pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
    batteryBadge: { position: 'absolute', bottom: 10, right: 14, flexDirection: 'row', alignItems: 'center', gap: 4 },
    batteryText: { fontSize: 12, fontWeight: '800' },
  });
}

type TileProps = {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  sub: string;
  styles: ReturnType<typeof makeStyles>;
  title: string;
};
function Tile({ color, icon, onPress, sub, styles, title }: TileProps) {
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
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { isDark, theme } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(theme, isDark), [theme, isDark]);
  const { batteryIsCharging, batteryLevel, canSendCommands, connectedDevice, disconnectFromBall, isConnected, sendCommandToBall } = useBluetoothSession();
  const { isPlaying, trackIndex, setIsPlaying, setTrackIndex } = usePlayerState();

  const [disconnectSending, setDisconnectSending] = useState(false);
  const [sleepSending, setSleepSending] = useState(false);
  const [sleepMode, setSleepMode] = useState(false);
  const [volume, setVolume] = useState(5);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showCanvas, setShowCanvas] = useState(isFocused);
  const [canvasVersion, setCanvasVersion] = useState(0);

  const playScale = useRef(new Animated.Value(1)).current;
  const skipBackScale = useRef(new Animated.Value(1)).current;
  const skipFwdScale = useRef(new Animated.Value(1)).current;
  const batteryChargePulse = useRef(new Animated.Value(0)).current;

  const deviceReady = isConnected && Boolean(connectedDevice);
  const displayBatteryLevel = deviceReady ? batteryLevel ?? 0 : 0;
  const displayBatteryCharging = deviceReady && batteryIsCharging === true;
  const displayBatteryColor = batteryColor(displayBatteryLevel);
  const displayIsPlaying = deviceReady && isPlaying;

  useEffect(() => {
    if (!isFocused) {
      setShowCanvas(false);
      return;
    }

    setShowCanvas(false);

    const interaction = InteractionManager.runAfterInteractions(() => {
      setCanvasVersion(version => version + 1);
      setShowCanvas(true);
    });

    return () => interaction.cancel();
  }, [isFocused]);

  useEffect(() => {
    if (!displayBatteryCharging) {
      batteryChargePulse.stopAnimation();
      batteryChargePulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(batteryChargePulse, {
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(batteryChargePulse, {
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          toValue: 0,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [batteryChargePulse, displayBatteryCharging]);

  const batteryChargeOpacity = batteryChargePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.62, 1],
  });
  const batteryChargeScale = batteryChargePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const pressIn = useCallback((scale: Animated.Value) => {
    Animated.spring(scale, { toValue: 1.22, useNativeDriver: true, tension: 300, friction: 8 }).start();
  }, []);
  const pressOut = useCallback((scale: Animated.Value) => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();
  }, []);

  const sendHardwareCommand = useCallback((command: string) => {
    if (!isConnected || !canSendCommands) return;
    void sendCommandToBall(command).catch(() => {});
  }, [canSendCommands, isConnected, sendCommandToBall]);

  const selectTrackAndPlay = useCallback((nextTrackIndex: number) => {
    const nextTrack = TRACKS[nextTrackIndex] ?? TRACKS[0];

    if (!deviceReady || !canSendCommands) {
      router.replace('/scan' as Href);
      return;
    }

    setTrackIndex(nextTrackIndex);
    setIsPlaying(true);

    void (async () => {
      await sendCommandToBall(nextTrack.command);
      await sendCommandToBall('PLAY');
    })().catch(() => {});
  }, [canSendCommands, deviceReady, router, sendCommandToBall, setIsPlaying, setTrackIndex]);

  const ballRotRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  const navBarHeight = insets.bottom;
  const SAFE_BOTTOM = navBarHeight + 16;
  const CLOSED_Y = SHEET_HEIGHT - PEEK_HEIGHT - SAFE_BOTTOM;

  const sheetY = useRef(new Animated.Value(CLOSED_Y)).current;
  const sheetPositionRef = useRef(CLOSED_Y);
  const closedYRef = useRef(CLOSED_Y);
  const sheetAnimationIdRef = useRef(0);
  const chevronRotate = useRef(new Animated.Value(0)).current;
  const chevronScale = useRef(new Animated.Value(1)).current;
  const chevronSpin = chevronRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  const pulseThenSettle = () => Animated.sequence([
    Animated.spring(chevronScale, { toValue: 1.35, useNativeDriver: true, tension: 260, friction: 6 }),
    Animated.spring(chevronScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
  ]);

  useEffect(() => {
    const listenerId = sheetY.addListener(({ value }) => { sheetPositionRef.current = value; });
    return () => { sheetY.removeListener(listenerId); };
  }, [sheetY]);

  useEffect(() => {
    closedYRef.current = CLOSED_Y;
    if (!sheetOpen) {
      sheetPositionRef.current = CLOSED_Y;
      sheetY.setValue(CLOSED_Y);
    }
  }, [CLOSED_Y, sheetOpen, sheetY]);

  const openSheet = () => {
    const animationId = ++sheetAnimationIdRef.current;
    sheetY.stopAnimation((value) => { sheetPositionRef.current = value; });
    setSheetOpen(true);
    Animated.parallel([
      Animated.spring(sheetY, { toValue: 0, useNativeDriver: false, tension: 58, friction: 13 }),
      Animated.spring(chevronRotate, { toValue: 1, useNativeDriver: true, tension: 130, friction: 8 }),
      pulseThenSettle(),
    ]).start(({ finished }) => {
      if (!finished || animationId !== sheetAnimationIdRef.current) return;
      sheetPositionRef.current = 0;
    });
  };

  const closeSheet = () => {
    const animationId = ++sheetAnimationIdRef.current;
    const targetY = closedYRef.current;
    sheetY.stopAnimation((value) => { sheetPositionRef.current = value; });
    Animated.parallel([
      Animated.spring(sheetY, { toValue: targetY, useNativeDriver: false, tension: 72, friction: 18 }),
      Animated.spring(chevronRotate, { toValue: 0, useNativeDriver: true, tension: 130, friction: 8 }),
      pulseThenSettle(),
    ]).start(({ finished }) => {
      if (!finished || animationId !== sheetAnimationIdRef.current) return;
      sheetPositionRef.current = targetY;
      setSheetOpen(false);
    });
  };

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

  const dragStartY = useRef(0);
  const sheetDrag = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) >= 6,
      onPanResponderGrant: () => {
        ++sheetAnimationIdRef.current;
        dragStartY.current = sheetPositionRef.current;
        sheetY.stopAnimation((value) => {
          sheetPositionRef.current = value;
          dragStartY.current = value;
        });
      },
      onPanResponderMove: (_, g) => {
        const next = clamp(dragStartY.current + g.dy, 0, closedYRef.current);
        sheetPositionRef.current = next;
        sheetY.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const cur = sheetPositionRef.current;
        if (g.vy > 0.4 || g.dy > 40 || cur > closedYRef.current * 0.42) { closeSheet(); }
        else { openSheet(); }
      },
      onPanResponderTerminate: () => {
        if (sheetPositionRef.current > closedYRef.current * 0.42) { closeSheet(); }
        else { openSheet(); }
      },
    })
  ).current;

  const ballPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
    onPanResponderGrant: () => { panStartRef.current = ballRotRef.current; },
    onPanResponderMove: (_, g) => {
      const next = { x: clamp(panStartRef.current.x + g.dy / 140, -1.1, 1.1), y: panStartRef.current.y + g.dx / 110 };
      ballRotRef.current = next;
    },
  })).current;

  const suffix = connectedDevice?.id ? connectedDevice.id.slice(-2).toUpperCase() : '--';

  const handlePlay = () => {
    if (!deviceReady || !canSendCommands) {
      router.replace('/scan' as Href);
      return;
    }

    const nextIsPlaying = !isPlaying;
    sendHardwareCommand(nextIsPlaying ? 'PLAY' : 'PAUSE');
    setIsPlaying(nextIsPlaying);
  };

  const handleSkipBack = () => {
    if (!deviceReady || !canSendCommands) {
      router.replace('/scan' as Href);
      return;
    }

    selectTrackAndPlay((trackIndex - 1 + TRACKS.length) % TRACKS.length);
  };

  const handleSkipForward = () => {
    if (!deviceReady || !canSendCommands) {
      router.replace('/scan' as Href);
      return;
    }

    selectTrackAndPlay((trackIndex + 1) % TRACKS.length);
  };

  const handleVolumeComplete = (nextVolume: number) => {
    const roundedVolume = Math.round(nextVolume);
    setVolume(roundedVolume);
    sendHardwareCommand(`VOL:${roundedVolume}`);
  };

  const handleSleepModeToggle = async () => {
    const nextSleepMode = !sleepMode;
    if (!deviceReady) { router.replace('/scan' as Href); return; }
    if (!canSendCommands) { Alert.alert(t('sleepUnavailable'), 'The BLE command channel is not ready yet.'); return; }
    try {
      setSleepSending(true);
      await sendCommandToBall(nextSleepMode ? 'SLEEP' : 'WAKE');
      setSleepMode(nextSleepMode);
    } catch (e) {
      Alert.alert(t('sleepCmdFailed'), e instanceof Error ? e.message : 'Could not change the device sleep mode.');
    } finally { setSleepSending(false); }
  };

  const handleDisconnect = async () => {
    if (!deviceReady) { closeSheet(); router.replace('/scan' as Href); return; }
    try {
      setDisconnectSending(true);
      await disconnectFromBall();
      setIsPlaying(false);
      setSleepMode(false);
      if (sheetOpen) closeSheet();
      router.replace('/scan' as Href);
    } catch (e) {
      Alert.alert(t('disconnectFailed'), e instanceof Error ? e.message : 'Could not disconnect from the device.');
    } finally {
      setDisconnectSending(false);
    }
  };

  const outerGlowColor = isDark ? 'rgba(93,24,54,0.24)' : 'rgba(168,85,247,0.10)';
  const midGlowColor = isDark ? 'rgba(143,32,62,0.22)' : 'rgba(168,85,247,0.07)';

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[theme.gradStart, theme.gradMid, theme.gradEnd]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {Platform.OS === 'android' && <View style={{ height: StatusBar.currentHeight ?? 24 }} />}
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor="transparent" translucent />

      <View style={styles.ballStage}>
        <View style={{ position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: outerGlowColor }} />
        <View style={{ position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: midGlowColor }} />
        <View {...ballPan.panHandlers} style={styles.canvasWrap}>
          {showCanvas && (
            <Suspense fallback={<ActivityIndicator color="#F05568" size="large" />}>
              <Canvas
                key={canvasVersion}
                camera={{ fov: 42, position: [0, 0, 6.2] }}
                onCreated={configureThreeNativeRenderer}
              >
                <ambientLight color="#ffffff" intensity={0.8} />
                <directionalLight color="#ffffff" intensity={2.2} position={[6, 8, 8]} />
                <directionalLight color="#FF8A98" intensity={1.4} position={[-6, 4, 4]} />
                <directionalLight color="#4B1631" intensity={0.9} position={[0, -8, 5]} />
                <BackgroundDust />
                <TexturedVisioball rotationRef={ballRotRef} />
              </Canvas>
            </Suspense>
          )}
        </View>
        <Animated.View
          style={[
            styles.batteryBadge,
            displayBatteryCharging && {
              opacity: batteryChargeOpacity,
              transform: [{ scale: batteryChargeScale }],
            },
          ]}
        >
          <Ionicons
            name={displayBatteryCharging ? 'battery-charging-outline' : batteryIconName(displayBatteryLevel)}
            size={15}
            color={displayBatteryColor}
          />
          <Text style={[styles.batteryText, { color: displayBatteryColor }]}>
            {displayBatteryCharging ? 'Charging' : `${displayBatteryLevel}%`}
          </Text>
        </Animated.View>
      </View>

      <View style={styles.stageSeparator} />

      <LinearGradient
        colors={isDark ? ['transparent', 'transparent'] : ['#EAE4FF', '#FFF2FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.content, { paddingBottom: PEEK_HEIGHT + SAFE_BOTTOM + 12 }]}
      >

        <View style={styles.statusRow}>
          <View style={[styles.statusChip, !deviceReady && styles.statusChipOff]}>
            <View style={[styles.statusDot, !deviceReady && styles.statusDotOff]} />
            <Text style={[styles.statusText, !deviceReady && styles.statusTextOff]}>
              {deviceReady ? t('connectedReady') : t('disconnected')}
            </Text>
          </View>
        </View>

        <View style={styles.volHeader}>
          <Text style={styles.sectionLabel}>{t('volume')}</Text>
          <Text style={styles.volVal}>{volume}</Text>
        </View>
        <FrequencySlider
          minimumValue={0}
          maximumValue={100}
          step={5}
          value={volume}
          onValueChange={setVolume}
          onSlidingComplete={handleVolumeComplete}
        />
        <View style={styles.ticksRow}>
          {VOLUME_STEPS.map(step => (
            <View key={step} style={styles.tickItem}>
              <View style={[styles.tickDot, volume >= step && styles.tickDotActive]} />
              {step % 20 === 0 && (
                <Text style={[styles.tickLabel, volume >= step && styles.tickLabelActive]}>{step}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.transport}>
          <Animated.View style={{ transform: [{ scale: skipBackScale }] }}>
            <Pressable
              style={styles.ctrlSkipBtn}
              onPress={handleSkipBack}
              onPressIn={() => pressIn(skipBackScale)}
              onPressOut={() => pressOut(skipBackScale)}
            >
              <Ionicons name="play-skip-back" size={22} color="#60A5FA" />
            </Pressable>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: playScale }] }}>
            <Pressable
              onPress={handlePlay}
              onPressIn={() => pressIn(playScale)}
              onPressOut={() => pressOut(playScale)}
              style={styles.playBtn}
            >
              <Ionicons name={displayIsPlaying ? 'pause' : 'play'} size={28} color="#F9FAFB" style={!displayIsPlaying && styles.playIconNudge} />
            </Pressable>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: skipFwdScale }] }}>
            <Pressable
              style={styles.ctrlSkipBtn}
              onPress={handleSkipForward}
              onPressIn={() => pressIn(skipFwdScale)}
              onPressOut={() => pressOut(skipFwdScale)}
            >
              <Ionicons name="play-skip-forward" size={22} color="#F472B6" />
            </Pressable>
          </Animated.View>
        </View>

        {deviceReady && (
          <Pressable
            disabled={disconnectSending}
            onPress={() => void handleDisconnect()}
            style={({ pressed }) => [
              styles.disconnectRow,
              pressed && styles.pressed,
              disconnectSending && styles.disabledPressable,
            ]}
          >
            {disconnectSending
              ? <ActivityIndicator color="#EF4444" />
              : <Ionicons name="unlink" size={18} color="#EF4444" />
            }
            <Text style={styles.disconnectText}>
              {disconnectSending ? t('disconnecting') : t('disconnect')}
            </Text>
          </Pressable>
        )}

        {!deviceReady && (
          <Pressable onPress={() => router.replace('/scan' as Href)} style={({ pressed }) => [styles.scanBtn, pressed && styles.pressed]}>
            <Ionicons name="scan" size={18} color="#080B14" />
            <Text style={styles.scanBtnText}>{t('scanForBall')}</Text>
          </Pressable>
        )}
      </LinearGradient>

      {sheetOpen && <Pressable style={styles.backdrop} onPress={closeSheet} />}

      <Animated.View
        {...sheetDrag.panHandlers}
        style={[
          styles.sheet,
          { paddingBottom: SAFE_BOTTOM, bottom: navBarHeight, height: SHEET_HEIGHT },
          { transform: [{ translateY: sheetY }] },
        ]}
      >
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
              <Text style={styles.peekLabel}>{sheetOpen ? t('closeMenu') : t('quickMenu')}</Text>
            </Pressable>

            <View style={styles.peekDotSlot}>
              <View style={[styles.peekDot, sheetOpen && styles.peekDotOpen]} />
            </View>
          </View>
        </View>

        <View style={[styles.sheetScroll, styles.sheetContent]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t('controls')}</Text>
            <Text style={styles.sheetSub}>VISIOBALL · Device {suffix}</Text>
          </View>

          <View style={styles.tilesGrid}>
            <Tile color="#A855F7" icon="musical-notes" sub={t('audioSub')} styles={styles}
              title={t('audio')} onPress={() => { closeSheet(); router.push('/sound' as Href); }} />
            <Tile color="#60A5FA" icon="locate" sub={t('locateSub')} styles={styles}
              title={t('locate')} onPress={() => { closeSheet(); router.push('/radar' as Href); }} />
            <Tile color="#F472B6" icon="settings-sharp" sub={t('settingsSub')} styles={styles}
              title={t('Settings')} onPress={() => { closeSheet(); router.push('/settings' as Href); }} />
          </View>

          <Pressable
            disabled={sleepSending}
            onPress={() => void handleSleepModeToggle()}
            style={({ pressed }) => [styles.sheetSleepRow, pressed && styles.pressed, sleepSending && styles.disabledPressable]}>
            <View>
              <Text style={styles.sheetSleepText}>{t('sleepMode')}</Text>
              <Text style={styles.sheetSleepSub}>{sleepSending ? t('updating') : t('sleepModeSub')}</Text>
            </View>
            <View style={[styles.track, sleepMode && styles.trackOn]}>
              <View style={[styles.thumb, sleepMode && styles.thumbOn]} />
            </View>
          </Pressable>

          <Text style={styles.footer}>{t('firmwareFooter')}</Text>
        </View>
      </Animated.View>

    </View>
  );
}
