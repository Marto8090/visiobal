import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const TRACKS = [
  { id: '1', title: 'Lora - Deep Focus', duration: '4:05', genre: 'Ambient' },
  { id: '2', title: 'Calm River Flow', duration: '3:42', genre: 'Nature' },
  { id: '3', title: 'Zen State', duration: '5:18', genre: 'Meditation' },
  { id: '4', title: 'Ocean Waves', duration: '6:01', genre: 'Nature' },
  { id: '5', title: 'Ambient Pulse', duration: '4:33', genre: 'Electronic' },
];

export default function SoundPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(TRACKS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentTrack = TRACKS.find(t => t.id === selectedId)!;

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#F1F5FF" />
        </Pressable>
        <Text style={styles.headerTitle}>SOUND LIBRARY</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Player card */}
      <View style={styles.playerCard}>

        {/* Art */}
        <View style={styles.artWrap}>
          <View style={styles.artInner}>
            <Ionicons name="musical-notes" size={40} color="#DC2626" />
          </View>
          <View style={styles.artGlow} />
        </View>

        <Text style={styles.trackTitle}>{currentTrack.title}</Text>
        <Text style={styles.trackMeta}>{currentTrack.genre} · {currentTrack.duration}</Text>

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
          <Pressable style={({ pressed }) => [styles.ctrlBtn, pressed && styles.pressed]}>
            <Ionicons name="play-skip-back" size={22} color="#8892A8" />
          </Pressable>
          <Pressable
            onPress={() => setIsPlaying(v => !v)}
            style={({ pressed }) => [styles.playBtn, pressed && styles.pressed]}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={30}
              color="#080B14"
              style={!isPlaying && { marginLeft: 3 }}
            />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.ctrlBtn, pressed && styles.pressed]}>
            <Ionicons name="play-skip-forward" size={22} color="#8892A8" />
          </Pressable>
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
                  ? <Ionicons name="volume-high" size={14} color="#DC2626" />
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080B14' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, backgroundColor: '#0F1220', borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#F1F5FF', fontSize: 13, fontWeight: '800', letterSpacing: 3 },

  playerCard: { backgroundColor: '#0F1220', marginHorizontal: 20, borderRadius: 24, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 24 },

  artWrap: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  artInner: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#161A2E', borderWidth: 1, borderColor: 'rgba(220,38,38,0.25)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  artGlow: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(220,38,38,0.12)' },

  trackTitle: { color: '#F1F5FF', fontSize: 18, fontWeight: '900', marginBottom: 4, textAlign: 'center' },
  trackMeta: { color: '#4A5268', fontSize: 13, fontWeight: '600', marginBottom: 20 },

  progressWrap: { width: '100%', marginBottom: 22 },
  progressTrack: { width: '100%', height: 4, backgroundColor: '#161A2E', borderRadius: 2, marginBottom: 8, overflow: 'visible' },
  progressFill: { width: '35%', height: '100%', backgroundColor: '#DC2626', borderRadius: 2 },
  progressKnob: { position: 'absolute', left: '35%', top: -4, width: 12, height: 12, borderRadius: 6, backgroundColor: '#DC2626', marginLeft: -6 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { color: '#4A5268', fontSize: 11, fontWeight: '600' },

  controls: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  ctrlBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', shadowColor: '#DC2626', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 10 },

  listLabel: { color: '#2A3050', fontSize: 10, fontWeight: '800', letterSpacing: 2, paddingHorizontal: 24, marginBottom: 10 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },

  trackRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1220', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 12 },
  trackRowActive: { borderColor: 'rgba(220,38,38,0.25)', backgroundColor: '#130D0D' },

  trackNum: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#161A2E', alignItems: 'center', justifyContent: 'center' },
  trackNumActive: { backgroundColor: 'rgba(220,38,38,0.15)' },
  trackNumText: { color: '#4A5268', fontSize: 12, fontWeight: '700' },

  trackInfo: { flex: 1, gap: 2 },
  trackName: { color: '#8892A8', fontSize: 14, fontWeight: '700' },
  trackNameActive: { color: '#F1F5FF' },
  trackGenre: { color: '#2A3050', fontSize: 11, fontWeight: '600' },
  trackDuration: { color: '#4A5268', fontSize: 12, fontWeight: '600' },

  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});