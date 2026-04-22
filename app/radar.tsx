import { Ionicons } from '@expo/vector-icons';
import { Canvas } from '@react-three/fiber/native';
import { useRouter } from 'expo-router';
import { Suspense, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TexturedVisioball } from '@/src/components/VisioballModel';

const { width, height } = Dimensions.get('window');

export default function RadarPage() {
  const router = useRouter();

  // Three staggered ring pulses
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  const makePulse = (anim: Animated.Value, delay: number) =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 2400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

  useEffect(() => {
    const a1 = makePulse(ring1, 0);
    const a2 = makePulse(ring2, 700);
    const a3 = makePulse(ring3, 1400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [ring1, ring2, ring3]);

  const ringStyle = (anim: Animated.Value) => ({
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] }) }],
    opacity: anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.6, 0.2, 0] }),
  });

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#F1F5FF" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Searching</Text>
          <View style={styles.searchingDots}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotMid]} />
            <View style={[styles.dot, styles.dotLow]} />
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>Move the ball within range</Text>

      {/* Radar stage */}
      <View style={styles.stage}>

        {/* Concentric guide circles */}
        <View style={[styles.guideRing, { width: width * 0.85, height: width * 0.85, borderRadius: width * 0.425 }]} />
        <View style={[styles.guideRing, { width: width * 0.58, height: width * 0.58, borderRadius: width * 0.29 }]} />

        {/* Animated pulse rings */}
        <Animated.View style={[styles.pulseRing, ringStyle(ring1)]} />
        <Animated.View style={[styles.pulseRing, ringStyle(ring2)]} />
        <Animated.View style={[styles.pulseRing, ringStyle(ring3)]} />

        {/* 3D Ball */}
        <View style={styles.ballWrap}>
          <Suspense fallback={null}>
            <Canvas camera={{ position: [0, 0, 8], fov: 40 }}>
              <ambientLight intensity={0.7} color="#ffffff" />
              <directionalLight position={[8, 8, 8]} intensity={2.6} color="#ffffff" />
              <directionalLight position={[-4, -2, 4]} intensity={1.0} color="#FF6B6B" />
              <TexturedVisioball />
            </Canvas>
          </Suspense>
        </View>
      </View>

      {/* Bottom info */}
      <View style={styles.bottom}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoDot} />
            <Text style={styles.infoText}>Scanning via Bluetooth 5.2</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Ionicons name="musical-notes" size={14} color="#4A5268" />
            <Text style={styles.infoText}>Listen for the audio ping</Text>
          </View>
        </View>

        <Pressable style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080B14', alignItems: 'center' },

  header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 4 },
  backBtn: { width: 40, height: 40, backgroundColor: '#0F1220', borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#F1F5FF', fontSize: 20, fontWeight: '800' },
  searchingDots: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#DC2626' },
  dotMid: { opacity: 0.6 },
  dotLow: { opacity: 0.3 },

  subtitle: { color: '#4A5268', fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 0 },

  stage: { width: width, height: height * 0.54, alignItems: 'center', justifyContent: 'center', marginTop: 10 },

  guideRing: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  pulseRing: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(220,38,38,0.18)' },
  ballWrap: { width: 260, height: 260, zIndex: 10 },

  bottom: { width: '100%', paddingHorizontal: 20, gap: 12, flex: 1, justifyContent: 'center' },
  infoCard: { backgroundColor: '#0F1220', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  infoText: { color: '#8892A8', fontSize: 13, fontWeight: '600' },
  infoDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },

  cancelBtn: { height: 50, backgroundColor: '#161A2E', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cancelText: { color: '#4A5268', fontSize: 15, fontWeight: '700' },

  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});