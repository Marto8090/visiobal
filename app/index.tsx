import { Canvas } from '@react-three/fiber/native';
import { useRouter } from 'expo-router';
import { Suspense, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackgroundDust, TexturedVisioball } from '@/src/components/VisioballModel';

const { width } = Dimensions.get('window');
const LOADER_WIDTH = 132;
const LOADER_DOT_SIZE = 12;

export default function IndexScreen() {
  const router = useRouter();
  const progress = useRef(new Animated.Value(0)).current;
  const redirectedRef = useRef(false);

  useEffect(() => {
    const duration = 2000 + Math.floor(Math.random() * 2001);

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (!finished || redirectedRef.current) {
        return;
      }

      redirectedRef.current = true;
      router.replace('/scan');
    });

    return () => {
      progress.stopAnimation();
    };
  }, [progress, router]);

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LOADER_WIDTH],
  });

  const dotTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LOADER_WIDTH - LOADER_DOT_SIZE],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#091121" />

      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.outerGlow} />
          <View style={styles.midGlow} />

          <View style={styles.canvasWrap}>
            <Suspense fallback={<ActivityIndicator size="large" color="#F05568" />}>
              <Canvas camera={{ position: [0, 0, 6.2], fov: 42 }}>
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

        <Text style={styles.title}>VisioBall</Text>

        <View style={styles.loaderSection}>
          <View style={styles.loaderTrack}>
            <Animated.View style={[styles.loaderFill, { width: fillWidth }]} />
            <Animated.View
              style={[
                styles.loaderDot,
                {
                  transform: [{ translateX: dotTranslateX }],
                },
              ]}
            />
          </View>

          <Text style={styles.loaderLabel}>Loading</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#091121',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#091121',
    paddingTop: 28,
    paddingBottom: 86,
  },
  hero: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  outerGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(93, 24, 54, 0.24)',
  },
  midGlow: {
    position: 'absolute',
    width: 228,
    height: 228,
    borderRadius: 114,
    backgroundColor: 'rgba(143, 32, 62, 0.22)',
  },
  canvasWrap: {
    width,
    height: width,
  },
  title: {
    marginTop: -16,
    color: '#F4F7FF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  loaderSection: {
    alignItems: 'center',
    gap: 12,
  },
  loaderTrack: {
    width: LOADER_WIDTH,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#21314C',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  loaderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: '#22D16F',
  },
  loaderDot: {
    position: 'absolute',
    width: LOADER_DOT_SIZE,
    height: LOADER_DOT_SIZE,
    borderRadius: LOADER_DOT_SIZE / 2,
    backgroundColor: '#1FB85F',
    shadowColor: '#22D16F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 5,
  },
  loaderLabel: {
    color: '#6F7D99',
    fontSize: 14,
    fontWeight: '500',
  },
});
