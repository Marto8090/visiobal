import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FrequencySlider } from '@/src/components/FrequencySlider';
import { useI18n } from '@/src/context/I18nContext';
import { ThemeColors, useTheme } from '@/src/context/ThemeContext';
import { useBluetoothSession } from '@/src/hooks/useBluetoothSession';

// Tracks with a `command` field send their BLE command to the hardware when selected.
// Tracks without `command` are demo-only (hardware not yet programmed for them).
const TRACKS = [
  { id: '1', title: 'C Major Journey',  duration: '3:45', genre: 'Ambient',     command: 'SONG1' },
  { id: '2', title: 'E Minor Groove',   duration: '2:37', genre: 'Electronic',  command: 'SONG2' },
  { id: '3', title: 'Zen State',        duration: '5:18', genre: 'Meditation',  command: null },
  { id: '4', title: 'Ocean Waves',      duration: '6:01', genre: 'Nature',      command: null },
  { id: '5', title: 'Ambient Pulse',    duration: '4:33', genre: 'Electronic',  command: null },
] as const;

type Track = typeof TRACKS[number];

const VOLUME_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function parseDuration(d: string): number {
  const [m, s] = d.split(':').map(Number);
  return m * 60 + (s ?? 0);
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function EqBars({ playing }: { playing: boolean }) {
  const b1 = useRef(new Animated.Value(0.5)).current;
  const b2 = useRef(new Animated.Value(0.8)).current;
  const b3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!playing) return;
    const anim = (val: Animated.Value, dur: number) =>
      Animated.loop(Animated.sequence([
        Animated.timing(val, { toValue: 1,    duration: dur, useNativeDriver: false }),
        Animated.timing(val, { toValue: 0.15, duration: dur, useNativeDriver: false }),
      ]));
    const a1 = anim(b1, 380);
    const a2 = anim(b2, 270);
    const a3 = anim(b3, 460);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [playing, b1, b2, b3]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14, width: 18 }}>
      {[b1, b2, b3].map((b, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3, backgroundColor: '#A855F7', borderRadius: 2,
            height: playing
              ? b.interpolate({ inputRange: [0, 1], outputRange: [3, 14] })
              : 6,
          }}
        />
      ))}
    </View>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.bg },
    container: { flex: 1, backgroundColor: theme.bg },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12,
    },
    backBtn: {
      width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
      shadowColor: '#A855F7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8,
    },
    headerTitle: { color: theme.text, fontSize: 13, fontWeight: '800', letterSpacing: 3 },
    playerCard: {
      backgroundColor: theme.card, marginHorizontal: 16, borderRadius: 22,
      padding: 16, borderWidth: 1, borderColor: theme.borderAccent, marginBottom: 16,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
    artWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
    artInner: {
      width: 56, height: 56, borderRadius: 14, backgroundColor: theme.bgDeep,
      borderWidth: 1, borderColor: 'rgba(168,85,247,0.28)',
      alignItems: 'center', justifyContent: 'center', zIndex: 2,
    },
    artGlow: { position: 'absolute', width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(168,85,247,0.09)' },
    trackTexts: { flex: 1 },
    trackTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginBottom: 3 },
    trackMeta: { color: theme.textSubtle, fontSize: 12, fontWeight: '600' },
    hwBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(34,197,94,0.10)', borderRadius: 7,
      paddingHorizontal: 7, paddingVertical: 3, marginTop: 5, alignSelf: 'flex-start',
    },
    hwDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#22C55E' },
    hwText: { color: '#22C55E', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    statusBar: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 8, paddingHorizontal: 2, marginBottom: 10,
      borderBottomWidth: 1, borderBottomColor: theme.separator,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },
    progressWrap: { marginBottom: 14 },
    progressTrack: { width: '100%', height: 4, backgroundColor: theme.bgDeep, borderRadius: 2, marginBottom: 6, overflow: 'visible' },
    progressFill: { height: '100%', backgroundColor: '#A855F7', borderRadius: 2 },
    progressKnob: { position: 'absolute', top: -4, width: 12, height: 12, borderRadius: 6, backgroundColor: '#A855F7', marginLeft: -6 },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    timeText: { color: theme.textSubtle, fontSize: 10, fontWeight: '600' },
    controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginBottom: 4 },
    ctrlBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    playBtn: {
      width: 58, height: 58, borderRadius: 18, backgroundColor: '#A855F7',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#A855F7', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10,
    },
    volumeSection: { width: '100%', marginTop: 10, borderTopWidth: 1, borderTopColor: theme.separator, paddingTop: 12 },
    volumeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    volumeLabel: { color: theme.textSubtle, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
    volumeValue: { color: '#A855F7', fontSize: 12, fontWeight: '900' },
    ticksRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 },
    tickItem: { alignItems: 'center', gap: 3 },
    tickDot: { width: 3, height: 5, borderRadius: 1.5, backgroundColor: theme.tickInactive },
    tickDotActive: { backgroundColor: '#A855F7' },
    tickLabel: { color: theme.tickLabel, fontSize: 8, fontWeight: '700' },
    tickLabelActive: { color: '#A855F7' },
    listLabel: { color: theme.textSubtle, fontSize: 10, fontWeight: '800', letterSpacing: 2, paddingHorizontal: 20, marginBottom: 8 },
    listContent: { paddingHorizontal: 16, paddingBottom: 24 },
    trackRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card,
      borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 7,
      borderWidth: 1, borderColor: theme.border, gap: 12,
    },
    trackRowActive: { borderColor: 'rgba(168,85,247,0.28)', backgroundColor: theme.bgDeep },
    trackRowDemo: { opacity: 0.55 },
    trackNum: { width: 30, height: 30, borderRadius: 9, backgroundColor: theme.bgDeep, alignItems: 'center', justifyContent: 'center' },
    trackNumActive: { backgroundColor: 'rgba(168,85,247,0.15)' },
    trackNumText: { color: theme.textSubtle, fontSize: 12, fontWeight: '700' },
    trackInfo: { flex: 1, gap: 2 },
    trackName: { color: theme.textMuted, fontSize: 14, fontWeight: '700' },
    trackNameActive: { color: theme.text },
    trackGenre: { color: theme.textSubtle, fontSize: 11, fontWeight: '600' },
    trackRight: { alignItems: 'flex-end', gap: 3 },
    trackDuration: { color: theme.textSubtle, fontSize: 12, fontWeight: '600' },
    liveChip: {
      backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 5,
      paddingHorizontal: 5, paddingVertical: 2,
    },
    liveChipText: { color: '#22C55E', fontSize: 9, fontWeight: '800' },
    demoChip: {
      backgroundColor: theme.bgDeep, borderRadius: 5,
      paddingHorizontal: 5, paddingVertical: 2,
    },
    demoChipText: { color: theme.textSubtle, fontSize: 9, fontWeight: '700' },
    pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  });
}

export default function SoundPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { isConnected, canSendCommands, sendCommandToBall } = useBluetoothSession();

  const [selectedId, setSelectedId] = useState<Track['id']>(TRACKS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playScale = useRef(new Animated.Value(1)).current;
  const skipBackScale = useRef(new Animated.Value(1)).current;
  const skipFwdScale = useRef(new Animated.Value(1)).current;

  const currentTrack: Track = TRACKS.find(t => t.id === selectedId) ?? TRACKS[0];
  const totalSeconds = parseDuration(currentTrack.duration);
  const progress = totalSeconds > 0 ? elapsed / totalSeconds : 0;
  const progressPct = `${Math.round(progress * 100)}%` as `${number}%`;
  const isHardwareTrack = currentTrack.command !== null;

  // Send BLE command whenever a hardware track is selected
  useEffect(() => {
    if (currentTrack.command && isConnected && canSendCommands) {
      void sendCommandToBall(currentTrack.command).catch(() => {});
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset elapsed when track changes
  useEffect(() => { setElapsed(0); }, [selectedId]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= totalSeconds) {
          setSelectedId(prev => {
            const i = TRACKS.findIndex(t => t.id === prev);
            return TRACKS[(i + 1) % TRACKS.length].id;
          });
          return 0;
        }
        return e + 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, selectedId, totalSeconds]);

  const pressIn = (scale: Animated.Value) =>
    Animated.spring(scale, { toValue: 1.22, useNativeDriver: true, tension: 300, friction: 8 }).start();
  const pressOut = (scale: Animated.Value) =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();

  const skipNext = () => {
    const i = TRACKS.findIndex(t => t.id === selectedId);
    setSelectedId(TRACKS[(i + 1) % TRACKS.length].id);
    setIsPlaying(true);
  };

  const skipPrev = () => {
    if (elapsed > 3) {
      setElapsed(0);
    } else {
      const i = TRACKS.findIndex(t => t.id === selectedId);
      setSelectedId(TRACKS[(i - 1 + TRACKS.length) % TRACKS.length].id);
      setIsPlaying(true);
    }
  };

  const connectedColor = isConnected ? '#22C55E' : '#F59E0B';
  const connectedLabel = isConnected ? 'Ball connected — hardware audio active' : 'Not connected — demo mode';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.statusBarStyle} />
      <View style={styles.container}>

        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#A855F7" />
          </Pressable>
          <Text style={styles.headerTitle}>{t('soundLibrary')}</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.playerCard}>

          {/* Connection status strip */}
          <View style={styles.statusBar}>
            <View style={[styles.statusDot, { backgroundColor: connectedColor }]} />
            <Text style={[styles.statusText, { color: connectedColor }]}>{connectedLabel}</Text>
          </View>

          <View style={styles.topRow}>
            <View style={styles.artWrap}>
              <View style={styles.artInner}>
                <Ionicons name="musical-notes" size={28} color="#A855F7" />
              </View>
              <View style={styles.artGlow} />
            </View>
            <View style={styles.trackTexts}>
              <Text style={styles.trackTitle} numberOfLines={1}>{currentTrack.title}</Text>
              <Text style={styles.trackMeta}>{currentTrack.genre} · {currentTrack.duration}</Text>
              {isHardwareTrack && (
                <View style={styles.hwBadge}>
                  <View style={styles.hwDot} />
                  <Text style={styles.hwText}>ON HARDWARE</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressPct }]} />
              <View style={[styles.progressKnob, { left: progressPct }]} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(elapsed)}</Text>
              <Text style={styles.timeText}>{currentTrack.duration}</Text>
            </View>
          </View>

          <View style={styles.controls}>
            <Animated.View style={{ transform: [{ scale: skipBackScale }] }}>
              <Pressable
                style={styles.ctrlBtn}
                onPress={skipPrev}
                onPressIn={() => pressIn(skipBackScale)}
                onPressOut={() => pressOut(skipBackScale)}
              >
                <Ionicons name="play-skip-back" size={22} color="#60A5FA" />
              </Pressable>
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: playScale }] }}>
              <Pressable
                onPress={() => setIsPlaying(v => !v)}
                onPressIn={() => pressIn(playScale)}
                onPressOut={() => pressOut(playScale)}
                style={styles.playBtn}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={28}
                  color="#F9FAFB"
                  style={!isPlaying && { marginLeft: 3 }}
                />
              </Pressable>
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: skipFwdScale }] }}>
              <Pressable
                style={styles.ctrlBtn}
                onPress={skipNext}
                onPressIn={() => pressIn(skipFwdScale)}
                onPressOut={() => pressOut(skipFwdScale)}
              >
                <Ionicons name="play-skip-forward" size={22} color="#F472B6" />
              </Pressable>
            </Animated.View>
          </View>

          <View style={styles.volumeSection}>
            <View style={styles.volumeHeader}>
              <Text style={styles.volumeLabel}>{t('volume')}</Text>
              <Text style={styles.volumeValue}>{volume}</Text>
            </View>
            <FrequencySlider
              value={volume}
              minimumValue={0}
              maximumValue={100}
              step={1}
              onValueChange={setVolume}
              onSlidingComplete={setVolume}
            />
            <View style={styles.ticksRow}>
              {VOLUME_STEPS.map(step => (
                <View key={step} style={styles.tickItem}>
                  <View style={[styles.tickDot, volume >= step && styles.tickDotActive]} />
                  {step % 20 === 0 && (
                    <Text style={[styles.tickLabel, volume >= step && styles.tickLabelActive]}>
                      {step}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.listLabel}>{t('allTracks')}</Text>
        <FlatList
          data={TRACKS}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const active = item.id === selectedId;
            const isHw = item.command !== null;
            return (
              <Pressable
                onPress={() => { setSelectedId(item.id); setIsPlaying(true); }}
                style={({ pressed }) => [
                  styles.trackRow,
                  active && styles.trackRowActive,
                  !isHw && styles.trackRowDemo,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.trackNum, active && styles.trackNumActive]}>
                  {active
                    ? <EqBars playing={isPlaying} />
                    : <Text style={styles.trackNumText}>{index + 1}</Text>
                  }
                </View>
                <View style={styles.trackInfo}>
                  <Text style={[styles.trackName, active && styles.trackNameActive]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.trackGenre}>{item.genre}</Text>
                </View>
                <View style={styles.trackRight}>
                  <Text style={styles.trackDuration}>{active ? formatTime(elapsed) : item.duration}</Text>
                  {isHw
                    ? <View style={styles.liveChip}><Text style={styles.liveChipText}>LIVE</Text></View>
                    : <View style={styles.demoChip}><Text style={styles.demoChipText}>DEMO</Text></View>
                  }
                </View>
              </Pressable>
            );
          }}
        />

      </View>
    </SafeAreaView>
  );
}
