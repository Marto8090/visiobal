import { Ionicons } from '@expo/vector-icons';
import { Canvas } from '@react-three/fiber/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Suspense, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FrequencySlider } from '@/src/components/FrequencySlider';
import { BackgroundDust, TexturedVisioball } from '@/src/components/VisioballModel';
import { configureThreeNativeRenderer } from '@/src/utils/configureThreeNativeRenderer';

const { width } = Dimensions.get('window');
const VOLUME_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function LandingPage() {
  const router = useRouter();
  const [showOptions, setShowOptions] = useState(false);
  const [speed, setSpeed] = useState(12);
  const [interval, setIntervalVal] = useState(15);
  const [motorMode, setMotorMode] = useState('Gentle');
  const [lightMode, setLightMode] = useState('Constant');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);

  const playScale = useRef(new Animated.Value(1)).current;
  const skipBackScale = useRef(new Animated.Value(1)).current;
  const skipFwdScale = useRef(new Animated.Value(1)).current;

  const pressIn = (scale: Animated.Value) =>
    Animated.spring(scale, { toValue: 1.22, useNativeDriver: true, tension: 300, friction: 8 }).start();

  const pressOut = (scale: Animated.Value) =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#142240', '#0F1A30', '#091121']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>

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

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.outerGlow} />
            <View style={styles.midGlow} />
            <View style={styles.canvasWrap}>
              <Suspense fallback={<ActivityIndicator size="large" color="#F05568" />}>
                <Canvas camera={{ position: [0, 0, 5.8], fov: 40 }} onCreated={configureThreeNativeRenderer}>
                  <ambientLight intensity={0.8} color="#ffffff" />
                  <directionalLight position={[6, 8, 8]} intensity={2.2} color="#ffffff" />
                  <directionalLight position={[-6, 4, 4]} intensity={1.4} color="#FF8A98" />
                  <directionalLight position={[0, -8, 5]} intensity={0.9} color="#4B1631" />
                  <BackgroundDust />
                  <TexturedVisioball rotationX={0.12} rotationY={0.2} />
                </Canvas>
              </Suspense>
            </View>
          </View>

          {/* Bottom card */}
          <View style={styles.bottom}>
            <View style={styles.bottomCard}>

              {/* Music controls — identical design to sound.tsx */}
              <View style={styles.musicControls}>
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

              {/* Volume — identical to sound.tsx volumeSection */}
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

              {/* Divider */}
              <View style={styles.cardDivider} />

              {/* Radar row */}
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
          </View>

        </View>
      </SafeAreaView>

      {/* Settings modal */}
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
              <Ionicons name="musical-notes" size={18} color="#fff" />
              <Text style={styles.musicBtnText}>Sound & Music</Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" style={styles.musicChevron} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#091121' },
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'space-between' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  wordmark: { color: '#F4F7FF', fontSize: 22, fontWeight: '900', letterSpacing: 5 },
  tagline: { color: '#7A8CAE', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginTop: 3 },
  powerBtn: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: { alignItems: 'center', justifyContent: 'center' },
  outerGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(93,24,54,0.24)',
  },
  midGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(143,32,62,0.22)',
  },
  canvasWrap: { width, height: width },

  bottom: { paddingHorizontal: 16, paddingBottom: 16 },
  bottomCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    padding: 16,
    gap: 14,
  },

  musicControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
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

  volumeSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(168,85,247,0.14)',
    paddingTop: 12,
  },
  volumeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  volumeLabel: { color: '#4A5268', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  volumeValue: { color: '#A855F7', fontSize: 12, fontWeight: '900' },

  ticksRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 },
  tickItem: { alignItems: 'center', gap: 3 },
  tickDot: { width: 3, height: 5, borderRadius: 1.5, backgroundColor: '#1E2740' },
  tickDotActive: { backgroundColor: '#A855F7' },
  tickLabel: { color: '#2A3050', fontSize: 8, fontWeight: '700' },
  tickLabelActive: { color: '#A855F7' },

  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },

  actionRow: { flexDirection: 'row', gap: 12 },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: {
    width: 56,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: {
    backgroundColor: '#0F1828',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 48,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  handle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: 22 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  sheetTitle: { color: '#F4F7FF', fontSize: 22, fontWeight: '900' },
  closeBtn: {
    width: 34,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },

  stepperRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  stepperCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  stepperLabel: { color: '#7A8CAE', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: '#DC2626', fontSize: 20, fontWeight: '300', lineHeight: 22 },
  stepVal: { color: '#F4F7FF', fontSize: 26, fontWeight: '900' },

  segLabel: { color: '#7A8CAE', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  seg: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 4,
    gap: 3,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  segOpt: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 11 },
  segOptActive: { backgroundColor: 'rgba(220,38,38,0.18)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)' },
  segText: { color: '#7A8CAE', fontSize: 13, fontWeight: '700' },
  segTextActive: { color: '#F87171' },

  musicBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  musicBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  musicChevron: { position: 'absolute', right: 18 },

  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});
