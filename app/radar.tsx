import React, { Suspense } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedRedSphere } from './landing'; // Reuse the ball component

const { width, height } = Dimensions.get('window');

export default function RadarPage() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </Pressable>

      <Text style={styles.searchingText}>Looking for Visioball...</Text>

      <View style={styles.radarContainer}>
        {/* Fake Radar Rings */}
        <View style={[styles.ring, styles.ring1]} />
        <View style={[styles.ring, styles.ring2]} />
        <View style={[styles.ring, styles.ring3]} />
        
        {/* The 3D Ball inside the Radar */}
        <View style={styles.canvasWrapper}>
          <Suspense fallback={null}>
            <Canvas camera={{ position: [0, 0, 8] }}>
              <ambientLight intensity={0.7} color="#ffffff" />
              <directionalLight position={[10, 20, 10]} intensity={3} color="#ffffff" />
              <AnimatedRedSphere />
            </Canvas>
          </Suspense>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', alignItems: 'center' },
  backButton: { position: 'absolute', top: 60, left: 20, zIndex: 10 },
  searchingText: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 120, letterSpacing: 1 },
  radarContainer: { width: width, height: height * 0.5, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  canvasWrapper: { width: 250, height: 250, position: 'absolute', zIndex: 5 },
  // CSS for static radar rings (you can animate these later with React Native Animated)
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: '#E60000', opacity: 0.3 },
  ring1: { width: 180, height: 180 },
  ring2: { width: 280, height: 280 },
  ring3: { width: 380, height: 380, opacity: 0.1 },
});