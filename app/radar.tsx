import { Ionicons } from '@expo/vector-icons';
import { Canvas } from '@react-three/fiber/native';
import { useRouter } from 'expo-router';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TexturedVisioball } from '@/src/components/VisioballModel';
import { useI18n } from '@/src/context/I18nContext';
import { ThemeColors, useTheme } from '@/src/context/ThemeContext';
import { configureThreeNativeRenderer } from '@/src/utils/configureThreeNativeRenderer';

const { width, height } = Dimensions.get('window');

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg, alignItems: 'center' },
    header: {
      width: '100%', flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4,
    },
    backBtn: {
      width: 40, height: 40, backgroundColor: theme.card, borderRadius: 13,
      alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { color: theme.text, fontSize: 20, fontWeight: '800' },
    searchingDots: { flexDirection: 'row', gap: 3, alignItems: 'center' },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#DC2626' },
    dotMid: { opacity: 0.6 },
    dotLow: { opacity: 0.3 },
    subtitle: { color: theme.textSubtle, fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 0 },
    stage: { width, height: height * 0.54, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    guideRing: { position: 'absolute', borderWidth: 1, borderColor: theme.border },
    pulseRing: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(220,38,38,0.18)' },
    ballWrap: { width: 260, height: 260, zIndex: 10 },
    bottom: { width: '100%', paddingHorizontal: 20, gap: 12, flex: 1, justifyContent: 'center' },
    infoCard: {
      backgroundColor: theme.card, borderRadius: 18, padding: 16,
      borderWidth: 1, borderColor: theme.border, gap: 12,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    infoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
    infoText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    infoDivider: { height: 1, backgroundColor: theme.separator },
    cancelBtn: {
      height: 50, backgroundColor: theme.card, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: theme.border,
    },
    cancelText: { color: theme.textSubtle, fontSize: 15, fontWeight: '700' },
    pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  });
}

export default function RadarPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const dotBounce = useRef(new Animated.Value(0)).current;

  const makePulse = (anim: Animated.Value, delay: number) =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

  const makeDotBounce = (anim: Animated.Value) =>
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

  useEffect(() => {
    const a1 = makePulse(ring1, 0);
    const a2 = makePulse(ring2, 700);
    const a3 = makePulse(ring3, 1400);
    const dots = makeDotBounce(dotBounce);
    a1.start(); a2.start(); a3.start(); dots.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); dots.stop(); };
  }, [dotBounce, ring1, ring2, ring3]);

  const ringStyle = (anim: Animated.Value) => ({
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] }) }],
    opacity: anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.6, 0.2, 0] }),
  });

  const dotStyle = (start: number) => ({
    transform: [{
      translateY: dotBounce.interpolate({
        inputRange: [0, start, start + 0.14, start + 0.28, 1],
        outputRange: [0, 0, -6, 0, 0],
      }),
    }],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.statusBarStyle} />

      <View style={styles.header}>
        <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('radarSearching')}</Text>
          <View style={styles.searchingDots}>
            <Animated.View style={[styles.dot, dotStyle(0.08)]} />
            <Animated.View style={[styles.dot, styles.dotMid, dotStyle(0.24)]} />
            <Animated.View style={[styles.dot, styles.dotLow, dotStyle(0.40)]} />
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>{t('radarSubtitle')}</Text>

      <View style={styles.stage}>
        <View style={[styles.guideRing, { width: width * 0.85, height: width * 0.85, borderRadius: width * 0.425 }]} />
        <View style={[styles.guideRing, { width: width * 0.58, height: width * 0.58, borderRadius: width * 0.29 }]} />
        <Animated.View style={[styles.pulseRing, ringStyle(ring1)]} />
        <Animated.View style={[styles.pulseRing, ringStyle(ring2)]} />
        <Animated.View style={[styles.pulseRing, ringStyle(ring3)]} />
        <View style={styles.ballWrap}>
          <Suspense fallback={null}>
            <Canvas camera={{ position: [0, 0, 8], fov: 40 }} onCreated={configureThreeNativeRenderer}>
              <ambientLight intensity={0.7} color="#ffffff" />
              <directionalLight position={[8, 8, 8]} intensity={2.6} color="#ffffff" />
              <directionalLight position={[-4, -2, 4]} intensity={1.0} color="#FF6B6B" />
              <TexturedVisioball />
            </Canvas>
          </Suspense>
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoDot} />
            <Text style={styles.infoText}>{t('radarBtScan')}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Ionicons name="musical-notes" size={14} color={theme.textSubtle} />
            <Text style={styles.infoText}>{t('radarAudioPing')}</Text>
          </View>
        </View>
        <Pressable style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]} onPress={() => router.back()}>
          <Text style={styles.cancelText}>{t('cancel')}</Text>
        </Pressable>
      </View>

    </SafeAreaView>
  );
}
