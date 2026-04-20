import { Ionicons } from "@expo/vector-icons";
import { Canvas } from "@react-three/fiber/native";
import { useRouter } from "expo-router";
import React, { Suspense, useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { TexturedVisioball } from "./landing";

const { width, height } = Dimensions.get("window");

export default function RadarPage() {
  const router = useRouter();

  // React Native Animation for expanding radar rings
  const ringAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(ringAnim, {
        toValue: 1,
        duration: 2500, // 2.5 seconds per pulse
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  // Map animation values to scale and opacity
  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 2], // Rings expand outward
  });
  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 0.3, 0], // Fade out as they expand
  });

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </Pressable>
        <Text style={styles.searchingText}>Searching...</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>Listen to the sound!</Text>

      {/* RADAR ANIMATION CENTER */}
      <View style={styles.radarContainer}>
        {/* Animated Blue Pulse */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        />

        {/* The Warm 3D Ball */}
        <View style={styles.canvasWrapper}>
          <Suspense fallback={null}>
            <Canvas camera={{ position: [0, 0, 8] }}>
              <ambientLight intensity={0.9} color="#ffffff" />
              <directionalLight
                position={[10, 10, 10]}
                intensity={2.5}
                color="#ffffff"
              />
              <TexturedVisioball /> {/* <--- CHANGED THIS FROM WarmVisioball */}
            </Canvas>
          </Suspense>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F8FC", alignItems: "center" },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  backButton: {
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 20,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchingText: { color: "#1E3A8A", fontSize: 22, fontWeight: "800" },
  subtitle: {
    color: "#64748B",
    fontSize: 16,
    marginTop: 12,
    fontWeight: "600",
  },

  radarContainer: {
    width: width,
    height: height * 0.6,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  canvasWrapper: { width: 300, height: 300, position: "absolute", zIndex: 5 },

  pulseRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#3B82F6",
    zIndex: 1,
  },
});
