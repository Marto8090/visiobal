import { Canvas } from '@react-three/fiber/native';
import { useRouter } from 'expo-router';
import { Suspense, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TexturedVisioball } from '@/src/components/VisioballModel';

const { width } = Dimensions.get('window');
const LOADING_BAR_WIDTH = 138;

export default function HomeScreen() {
  const router = useRouter();
  const progress = useRef(new Animated.Value(0)).current;
  const loadingDurationMs = useRef(2000 + Math.round(Math.random() * 2000)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: loadingDurationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        router.replace('/scan');
      }
    });

    return () => {
      animation.stop();
    };
  }, [loadingDurationMs, progress, router]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LOADING_BAR_WIDTH],
  });
  const knobTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LOADING_BAR_WIDTH - 10],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.outerHalo} />
          <View style={styles.innerHalo} />

          <View style={styles.ballCanvas}>
            <Suspense fallback={<ActivityIndicator color={COLORS.green} />}>
              <Canvas camera={{ position: [0, 0, 6], fov: 42 }}>
                <ambientLight color="#ffffff" intensity={0.8} />
                <directionalLight color="#ffffff" intensity={2.2} position={[4, 5, 5]} />
                <directionalLight color="#72f5ad" intensity={0.6} position={[-4, -2, 3]} />
                <TexturedVisioball />
              </Canvas>
            </Suspense>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>VisioBall</Text>
          <Text style={styles.subtitle}>Your smart training ball is ready to pair.</Text>

          <View style={styles.loadingBlock}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              <Animated.View
                style={[
                  styles.progressKnob,
                  { transform: [{ translateX: knobTranslateX }] },
                ]}
              />
            </View>
            <Text style={styles.loadingText}>Loading</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </View>
    </SafeAreaView>
  );
}

const COLORS = {
  background: '#070D1A',
  green: '#28E27F',
  text: '#F7FAFF',
  muted: '#8C95A8',
  line: '#203047',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 34,
    backgroundColor: COLORS.background,
  },
  hero: {
    height: Math.min(width * 1.04, 390),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  outerHalo: {
    position: 'absolute',
    width: width * 0.98,
    height: width * 0.98,
    maxWidth: 390,
    maxHeight: 390,
    borderRadius: 999,
    backgroundColor: 'rgba(230, 53, 95, 0.06)',
  },
  innerHalo: {
    position: 'absolute',
    width: width * 0.72,
    height: width * 0.72,
    maxWidth: 288,
    maxHeight: 288,
    borderRadius: 999,
    backgroundColor: 'rgba(230, 53, 95, 0.12)',
  },
  ballCanvas: {
    width: width * 0.88,
    height: width * 0.88,
    maxWidth: 340,
    maxHeight: 340,
  },
  content: {
    alignItems: 'center',
    gap: 16,
    marginTop: -16,
  },
  title: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  subtitle: {
    maxWidth: 280,
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  loadingBlock: {
    alignItems: 'center',
    marginTop: 78,
  },
  progressTrack: {
    width: LOADING_BAR_WIDTH,
    height: 4,
    borderRadius: 99,
    backgroundColor: COLORS.line,
    justifyContent: 'center',
  },
  progressFill: {
    height: 4,
    borderRadius: 99,
    backgroundColor: COLORS.green,
  },
  progressKnob: {
    position: 'absolute',
    left: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.green,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  bottomSpacer: {
    height: 58,
  },
});
