import { Ionicons } from '@expo/vector-icons';
import { Canvas } from '@react-three/fiber/native';
import { useRouter } from 'expo-router';
import { Suspense, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackgroundDust, TexturedVisioball } from '@/src/components/VisioballModel';

const { width, height } = Dimensions.get('window');

export default function LandingPage() {
  const router = useRouter();
  const [showOptions, setShowOptions] = useState(false);
  const [speed, setSpeed] = useState(12);
  const [interval, setIntervalVal] = useState(15);
  const [motorMode, setMotorMode] = useState('Gentle');
  const [lightMode, setLightMode] = useState('Constant');

  return (
    <View style={styles.container}>

      {/* Ambient glow */}
      <View style={styles.ambientGlow} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.wordmark}>VISIOBALL</Text>
          <Text style={styles.tagline}>Smart Training Ball</Text>
        </View>
        <Pressable style={({ pressed }) => [styles.powerBtn, pressed && styles.pressed]}>
          <Ionicons name="power" size={22} color="#DC2626" />
        </Pressable>
      </View>

      {/* Full-bleed 3D ball */}
      <View style={styles.canvasWrapper}>
        <Suspense fallback={<ActivityIndicator size="large" color="#DC2626" />}>
          <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
            <ambientLight intensity={0.5} color="#ffffff" />
            <directionalLight position={[8, 8, 8]} intensity={2.4} color="#ffffff" />
            <directionalLight position={[-8, 4, -4]} intensity={1.8} color="#FF6B6B" />
            <directionalLight position={[0, -8, 4]} intensity={1.0} color="#FF3333" />
            <BackgroundDust />
            <TexturedVisioball />
          </Canvas>
        </Suspense>
      </View>

      {/* Bottom actions */}
      <View style={styles.bottom}>
        <Text style={styles.helperText}>Tap radar to search for devices</Text>
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={() => router.push('/radar')}
          >
            <Ionicons name="scan" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Radar Scan</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            onPress={() => setShowOptions(true)}
          >
            <Ionicons name="options-outline" size={22} color="#DC2626" />
          </Pressable>
        </View>
      </View>

      {/* SETTINGS MODAL */}
      <Modal visible={showOptions} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Device Settings</Text>
              <Pressable onPress={() => setShowOptions(false)} style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}>
                <Ionicons name="close" size={20} color="#8892A8" />
              </Pressable>
            </View>

            {/* Speed + Interval */}
            <View style={styles.stepperRow}>
              {[
                { label: 'SPEED', val: speed, set: setSpeed },
                { label: 'INTERVAL', val: interval, set: setIntervalVal },
              ].map(({ label, val, set }) => (
                <View key={label} style={styles.stepperCard}>
                  <Text style={styles.stepperLabel}>{label}</Text>
                  <View style={styles.stepper}>
                    <Pressable onPress={() => set(v => Math.max(1, v - 1))} style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}>
                      <Text style={styles.stepBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.stepVal}>{val}</Text>
                    <Pressable onPress={() => set(v => Math.min(20, v + 1))} style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}>
                      <Text style={styles.stepBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.segLabel}>MOTOR MODE</Text>
            <View style={styles.seg}>
              {['Gentle', 'Dynamic', 'Random'].map(m => (
                <Pressable key={m} onPress={() => setMotorMode(m)} style={[styles.segOpt, motorMode === m && styles.segOptActive]}>
                  <Text style={[styles.segText, motorMode === m && styles.segTextActive]}>{m}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.segLabel}>LIGHT MODE</Text>
            <View style={styles.seg}>
              {['Constant', 'Breathing', 'Heartbeat'].map(m => (
                <Pressable key={m} onPress={() => setLightMode(m)} style={[styles.segOpt, lightMode === m && styles.segOptActive]}>
                  <Text style={[styles.segText, lightMode === m && styles.segTextActive]}>{m}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.musicBtn, pressed && styles.pressed]}
              onPress={() => { setShowOptions(false); router.push('/sound'); }}
            >
              <Ionicons name="musical-notes" size={18} color="#080B14" />
              <Text style={styles.musicBtnText}>Sound & Music</Text>
              <Ionicons name="chevron-forward" size={18} color="#080B14" style={styles.musicChevron} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080B14', justifyContent: 'space-between' },
  ambientGlow: { position: 'absolute', top: 40, left: width / 2 - 150, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(220,38,38,0.07)' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, paddingTop: 58, zIndex: 10 },
  wordmark: { color: '#F1F5FF', fontSize: 22, fontWeight: '900', letterSpacing: 5 },
  tagline: { color: '#4A5268', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginTop: 3 },
  powerBtn: { width: 44, height: 44, backgroundColor: '#0F1220', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },

  canvasWrapper: { position: 'absolute', top: 0, left: 0, width, height: height * 0.72 },

  bottom: { paddingHorizontal: 20, paddingBottom: 40, zIndex: 10, gap: 14 },
  helperText: { color: '#4A5268', fontSize: 13, fontWeight: '600', textAlign: 'center', letterSpacing: 0.3 },
  actionRow: { flexDirection: 'row', gap: 12 },
  primaryBtn: { flex: 1, backgroundColor: '#DC2626', flexDirection: 'row', paddingVertical: 18, borderRadius: 22, justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#DC2626', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { width: 60, backgroundColor: '#0F1220', borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: { backgroundColor: '#0F1220', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 48, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  handle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, alignSelf: 'center', marginBottom: 22 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  sheetTitle: { color: '#F1F5FF', fontSize: 22, fontWeight: '900' },
  closeBtn: { width: 34, height: 34, backgroundColor: '#161A2E', borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  stepperRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  stepperCard: { flex: 1, backgroundColor: '#161A2E', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  stepperLabel: { color: '#4A5268', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: { width: 32, height: 32, backgroundColor: '#0F1220', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: '#DC2626', fontSize: 20, fontWeight: '300', lineHeight: 22 },
  stepVal: { color: '#F1F5FF', fontSize: 26, fontWeight: '900' },

  segLabel: { color: '#4A5268', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  seg: { flexDirection: 'row', backgroundColor: '#161A2E', borderRadius: 14, padding: 4, gap: 3, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  segOpt: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 11 },
  segOptActive: { backgroundColor: 'rgba(220,38,38,0.18)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)' },
  segText: { color: '#4A5268', fontSize: 13, fontWeight: '700' },
  segTextActive: { color: '#F87171' },

  musicBtn: { backgroundColor: '#DC2626', flexDirection: 'row', paddingVertical: 18, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4, shadowColor: '#DC2626', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
  musicBtnText: { color: '#080B14', fontSize: 15, fontWeight: '800' },
  musicChevron: { position: 'absolute', right: 18 },

  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});