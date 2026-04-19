import { Canvas, useFrame } from "@react-three/fiber/native";
import React, { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Mesh } from "three";

// The over-the-top 3D Ball Component
function AnimatedVisioball() {
  const coreRef = useRef<Mesh>(null);
  const shellRef = useRef<Mesh>(null);

  // Complex rotation animation
  useFrame((state, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.5;
      coreRef.current.rotation.x += delta * 0.2;
    }
    if (shellRef.current) {
      shellRef.current.rotation.y -= delta * 0.3;
      shellRef.current.rotation.z += delta * 0.4;
    }
  });

  return (
    <group>
      {/* Inner glowing core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial
          color="#00d2ff"
          emissive="#00d2ff"
          emissiveIntensity={1.2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Outer wireframe shell for a unique look */}
      <mesh ref={shellRef}>
        <sphereGeometry args={[2, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          wireframe={true}
          transparent={true}
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

export default function LandingPage() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* You can style this text to match your screenshot perfectly */}
        <Text style={styles.title}>Device Connected</Text>
        <Text style={styles.subtitle}>Visioball is ready</Text>
      </View>

      <View style={styles.canvasContainer}>
        <Canvas>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={2} />
          <directionalLight position={[-5, 5, 5]} intensity={1} />
          <AnimatedVisioball />
        </Canvas>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a", // Dark background to make the glowing ball pop
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    position: "absolute",
    top: 100,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  canvasContainer: {
    width: 350,
    height: 350,
  },
});
