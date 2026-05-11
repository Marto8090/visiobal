import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FrequencySlider } from '@/src/components/FrequencySlider';

const TRACKS = [
  { id: '1', title: 'Lora - Deep Focus', duration: '4:05', genre: 'Ambient' },
  { id: '2', title: 'Calm River Flow', duration: '3:42', genre: 'Nature' },
  { id: '3', title: 'Zen State', duration: '5:18', genre: 'Meditation' },
  { id: '4', title: 'Ocean Waves', duration: '6:01', genre: 'Nature' },
  { id: '5', title: 'Ambient Pulse', duration: '4:33', genre: 'Electronic' },
];

const VOLUME_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function SoundPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(TRACKS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);

  const playScale = useRef(new Animated.Value(1)).current;
  const skipBackScale = useRef(new Animated.Value(1)).current;
  const skipFwdScale = useRef(new Animated.Value(1)).current;

  const currentTrack = TRACKS.find(t => t.id === selectedId)!;

  const pressIn = (scale: Animated.Value) =>
    Animated.spring(scale, { toValue: 1.22, useNativeDriver: true, tension: 300, friction: 8 }).start();

  const pressOut = (scale: Animated.Value) =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#A855F7" />
          </Pressable>
          <Text style={styles.headerTitle}>SOUND LIBRARY</Text>
          <View style={{ width: 34 }} />
        </View>

        {/* Player card */}
        <View style={styles.playerCard}>

          {/* Art + track info row */}
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
            </View>
          </View>

          {/* Progress */}
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
              <View style={styles.progressKnob} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>1:24</Text>
              <Text style={styles.timeText}>{currentTrack.duration}</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <Animated.View style={{ transform: [{ scale: skipBackScale }] }}>
              <Pressable
                style={styles.ctrlBtn}
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
                onPressIn={() => pressIn(skipFwdScale)}
                onPressOut={() => pressOut(skipFwdScale)}
              >
                <Ionicons name="play-skip-forward" size={22} color="#F472B6" />
              </Pressable>
            </Animated.View>
          </View>

          {/* Volume */}
          <View style={styles.volumeSection}>
            <View style={styles.volumeHeader}>
              <Text style={styles.volumeLabel}>VOLUME</Text>
              <Text style={styles.volumeValue}>{volume}</Text>
            </View>
            <FrequencySlider
              value={volume}
              minimumValue={0}
              maximumValue={100}
              step={10}
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

        {/* Track list */}
        <Text style={styles.listLabel}>ALL TRACKS</Text>
        <FlatList
          data={TRACKS}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const active = item.id === selectedId;
            return (
              <Pressable
                onPress={() => { setSelectedId(item.id); setIsPlaying(true); }}
                style={({ pressed }) => [styles.trackRow, active && styles.trackRowActive, pressed && styles.pressed]}
              >
                <View style={[styles.trackNum, active && styles.trackNumActive]}>
                  {active
                    ? <Ionicons name="volume-high" size={14} color="#A855F7" />
                    : <Text style={styles.trackNumText}>{index + 1}</Text>
                  }
                </View>
                <View style={styles.trackInfo}>
                  <Text style={[styles.trackName, active && styles.trackNameActive]} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.trackGenre}>{item.genre}</Text>
                </View>
                <Text style={styles.trackDuration}>{item.duration}</Text>
              </Pressable>
            );
          }}
        />

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080B14' },
  container: { flex: 1, backgroundColor: '#080B14' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  headerTitle: { color: '#F1F5FF', fontSize: 13, fontWeight: '800', letterSpacing: 3 },

  playerCard: {
    backgroundColor: '#0F1220',
    marginHorizontal: 16,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.18)',
    marginBottom: 16,
  },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  artWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  artInner: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#161A2E',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  artGlow: { position: 'absolute', width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(168,85,247,0.09)' },
  trackTexts: { flex: 1 },
  trackTitle: { color: '#F1F5FF', fontSize: 16, fontWeight: '900', marginBottom: 3 },
  trackMeta: { color: '#4A5268', fontSize: 12, fontWeight: '600' },

  progressWrap: { marginBottom: 14 },
  progressTrack: { width: '100%', height: 4, backgroundColor: '#161A2E', borderRadius: 2, marginBottom: 6, overflow: 'visible' },
  progressFill: { width: '35%', height: '100%', backgroundColor: '#A855F7', borderRadius: 2 },
  progressKnob: { position: 'absolute', left: '35%', top: -4, width: 12, height: 12, borderRadius: 6, backgroundColor: '#A855F7', marginLeft: -6 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { color: '#4A5268', fontSize: 10, fontWeight: '600' },

  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginBottom: 4 },
  ctrlBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  playBtn: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },

  volumeSection: { width: '100%', marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.12)', paddingTop: 12 },
  volumeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  volumeLabel: { color: '#4A5268', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  volumeValue: { color: '#A855F7', fontSize: 12, fontWeight: '900' },

  ticksRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 },
  tickItem: { alignItems: 'center', gap: 3 },
  tickDot: { width: 3, height: 5, borderRadius: 1.5, backgroundColor: '#1E2740' },
  tickDotActive: { backgroundColor: '#A855F7' },
  tickLabel: { color: '#2A3050', fontSize: 8, fontWeight: '700' },
  tickLabelActive: { color: '#A855F7' },

  listLabel: { color: '#2A3050', fontSize: 10, fontWeight: '800', letterSpacing: 2, paddingHorizontal: 20, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  trackRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1220', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 12 },
  trackRowActive: { borderColor: 'rgba(168,85,247,0.28)', backgroundColor: '#11102A' },

  trackNum: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#161A2E', alignItems: 'center', justifyContent: 'center' },
  trackNumActive: { backgroundColor: 'rgba(168,85,247,0.15)' },
  trackNumText: { color: '#4A5268', fontSize: 12, fontWeight: '700' },

  trackInfo: { flex: 1, gap: 2 },
  trackName: { color: '#8892A8', fontSize: 14, fontWeight: '700' },
  trackNameActive: { color: '#F1F5FF' },
  trackGenre: { color: '#2A3050', fontSize: 11, fontWeight: '600' },
  trackDuration: { color: '#4A5268', fontSize: 12, fontWeight: '600' },

  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});
