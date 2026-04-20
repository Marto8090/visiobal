import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const TRACKS = [
  { id: '1', title: 'Lora' },
  { id: '2', title: 'Calm' },
  { id: '3', title: 'Focus' },
  { id: '4', title: 'Ocean' },
  { id: '5', title: 'Ambience' },
];

export default function SoundPage() {
  const router = useRouter();
  const [selectedTrack, setSelectedTrack] = useState(TRACKS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>SOUND</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Player Area */}
      <View style={styles.playerContainer}>
        <View style={styles.albumArtFake}>
          <Ionicons name="musical-notes" size={60} color="#E60000" />
        </View>
        <Text style={styles.nowPlayingTitle}>
          {TRACKS.find(t => t.id === selectedTrack)?.title}
        </Text>
        
        {/* Fake Seek Bar */}
        <View style={styles.seekBar}>
          <View style={styles.seekFill} />
        </View>

        <View style={styles.controls}>
          <Ionicons name="play-skip-back" size={32} color="#fff" />
          <Pressable style={styles.playBtn} onPress={() => setIsPlaying(!isPlaying)}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
          </Pressable>
          <Ionicons name="play-skip-forward" size={32} color="#fff" />
        </View>
      </View>

      {/* Track List */}
      <FlatList
        data={TRACKS}
        keyExtractor={(item) => item.id}
        style={styles.trackList}
        renderItem={({ item }) => (
          <Pressable 
            style={[styles.trackItem, selectedTrack === item.id && styles.trackItemActive]}
            onPress={() => {
              setSelectedTrack(item.id);
              setIsPlaying(true);
            }}
          >
            <Text style={[styles.trackText, selectedTrack === item.id && styles.trackTextActive]}>
              Track {item.id} - {item.title}
            </Text>
            {selectedTrack === item.id && <Ionicons name="stats-chart" size={16} color="#E60000" />}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
  playerContainer: { alignItems: 'center', padding: 20 },
  albumArtFake: { width: 150, height: 150, backgroundColor: '#1a1a1a', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  nowPlayingTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  seekBar: { width: '80%', height: 4, backgroundColor: '#333', borderRadius: 2, marginBottom: 30 },
  seekFill: { width: '30%', height: '100%', backgroundColor: '#E60000', borderRadius: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 40 },
  playBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E60000', justifyContent: 'center', alignItems: 'center' },
  trackList: { paddingHorizontal: 20 },
  trackItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  trackItemActive: { backgroundColor: 'rgba(230, 0, 0, 0.05)', borderRadius: 10, paddingHorizontal: 10 },
  trackText: { color: '#888', fontSize: 16 },
  trackTextActive: { color: '#fff', fontWeight: 'bold' }
});