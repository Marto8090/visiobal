import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const TRACKS = [
  { id: '1', title: 'Lora - Deep Focus' },
  { id: '2', title: 'Calm River Flow' },
  { id: '3', title: 'Zen State' },
  { id: '4', title: 'Ocean Waves' },
  { id: '5', title: 'Ambient Pulse' },
];

export default function SoundPage() {
  const router = useRouter();
  const [selectedTrack, setSelectedTrack] = useState(TRACKS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </Pressable>
        <Text style={styles.headerTitle}>SOUND LIBRARY</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Main Player Card */}
      <View style={styles.playerCard}>
        <View style={styles.artPlaceholder}>
          <Ionicons name="musical-notes" size={50} color="#3B82F6" />
        </View>
        <Text style={styles.nowPlayingTitle}>
          {TRACKS.find(t => t.id === selectedTrack)?.title}
        </Text>
        <Text style={styles.nowPlayingSub}>Visioball Audio Sync</Text>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>1:24</Text>
            <Text style={styles.timeText}>4:05</Text>
          </View>
        </View>

        {/* Media Controls */}
        <View style={styles.controls}>
          <Pressable><Ionicons name="play-skip-back" size={32} color="#64748B" /></Pressable>
          <Pressable 
            style={({pressed}) => [styles.playBtn, pressed && {transform: [{scale: 0.9}]}]} 
            onPress={() => setIsPlaying(!isPlaying)}
          >
            <Ionicons name={isPlaying ? "pause" : "play"} size={36} color="#fff" style={{marginLeft: isPlaying ? 0 : 4}}/>
          </Pressable>
          <Pressable><Ionicons name="play-skip-forward" size={32} color="#64748B" /></Pressable>
        </View>
      </View>

      {/* Clean Track List */}
      <FlatList
        data={TRACKS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isActive = selectedTrack === item.id;
          return (
            <Pressable 
              style={[styles.trackItem, isActive && styles.trackItemActive]}
              onPress={() => { setSelectedTrack(item.id); setIsPlaying(true); }}
            >
              <View style={styles.trackInfo}>
                <View style={[styles.trackNumber, isActive && styles.trackNumberActive]}>
                  <Ionicons name={isActive ? "volume-high" : "musical-note"} size={16} color={isActive ? "#fff" : "#64748B"} />
                </View>
                <Text style={[styles.trackText, isActive && styles.trackTextActive]}>{item.title}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F8FC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 },
  backBtn: { backgroundColor: '#FFFFFF', padding: 10, borderRadius: 20, shadowColor: '#94A3B8', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  headerTitle: { color: '#1E3A8A', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  
  playerCard: { backgroundColor: '#FFFFFF', margin: 24, borderRadius: 32, padding: 24, alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.08, shadowRadius: 20, elevation: 10 },
  artPlaceholder: { width: 100, height: 100, backgroundColor: '#EFF6FF', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  nowPlayingTitle: { color: '#0F172A', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  nowPlayingSub: { color: '#3B82F6', fontSize: 14, fontWeight: '700', marginBottom: 24 },
  
  progressContainer: { width: '100%', marginBottom: 24 },
  progressBar: { width: '100%', height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, marginBottom: 8 },
  progressFill: { width: '35%', height: '100%', backgroundColor: '#3B82F6', borderRadius: 3 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  
  controls: { flexDirection: 'row', alignItems: 'center', width: '80%', justifyContent: 'space-between' },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  trackItem: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, marginBottom: 12, shadowColor: '#94A3B8', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  trackItemActive: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  trackInfo: { flexDirection: 'row', alignItems: 'center' },
  trackNumber: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  trackNumberActive: { backgroundColor: '#3B82F6' },
  trackText: { color: '#334155', fontSize: 16, fontWeight: '700' },
  trackTextActive: { color: '#1E3A8A', fontWeight: '900' }
});