import React, { useRef, useState, Suspense } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Modal, ActivityIndicator } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { Mesh } from 'three';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// --- THE 3D BALL (Fixed rendering) ---
export function AnimatedRedSphere() {
  const meshRef = useRef<Mesh>(null);
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
      meshRef.current.rotation.x += delta * 0.15;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2.5, 64, 64]} />
      <meshStandardMaterial 
        color="#E60000" 
        emissive="#4A0000"
        emissiveIntensity={0.5}
        roughness={0.15}
        metalness={0.8}
      />
    </mesh>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [showOptions, setShowOptions] = useState(false);
  
  // Options State
  const [speed, setSpeed] = useState(12);
  const [interval, setInterval] = useState(15);
  const [motorMode, setMotorMode] = useState('Gentle');
  const [lightMode, setLightMode] = useState('Constant');

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>VISIOBALL</Text>
        <Ionicons name="power" size={28} color="#E60000" />
      </View>

      {/* 3D CANVAS - Click to go to Radar */}
      <Pressable style={styles.canvasContainer} onPress={() => router.push('/radar')}>
        <Suspense fallback={<ActivityIndicator size="large" color="#E60000" />}>
          <Canvas camera={{ position: [0, 0, 7] }}>
            <ambientLight intensity={0.7} color="#ffffff" />
            <directionalLight position={[10, 20, 10]} intensity={3} color="#ffffff" />
            <directionalLight position={[-10, -10, 10]} intensity={1.5} color="#ff4d4d" />
            <AnimatedRedSphere />
          </Canvas>
        </Suspense>
        <Text style={styles.radarHintText}>Tap ball to search</Text>
      </Pressable>

      {/* BOTTOM ARROW TO OPEN OPTIONS */}
      <Pressable style={styles.bottomArrowArea} onPress={() => setShowOptions(true)}>
        <Text style={styles.optionsHintText}>Options</Text>
        <Ionicons name="chevron-up" size={32} color="#fff" />
      </Pressable>

      {/* OPTIONS POP-UP MODAL */}
      <Modal visible={showOptions} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Options</Text>
              <Pressable onPress={() => setShowOptions(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </Pressable>
            </View>

            {/* Speed & Interval */}
            <View style={styles.row}>
              <View style={styles.halfCard}>
                <Text style={styles.label}>Speed</Text>
                <View style={styles.stepper}>
                  <Pressable onPress={() => setSpeed(s => s - 1)}><Text style={styles.stepperBtn}>-</Text></Pressable>
                  <Text style={styles.stepperVal}>{speed}</Text>
                  <Pressable onPress={() => setSpeed(s => s + 1)}><Text style={styles.stepperBtn}>+</Text></Pressable>
                </View>
              </View>
              <View style={styles.halfCard}>
                <Text style={styles.label}>Interval</Text>
                <View style={styles.stepper}>
                  <Pressable onPress={() => setInterval(i => i - 1)}><Text style={styles.stepperBtn}>-</Text></Pressable>
                  <Text style={styles.stepperVal}>{interval}</Text>
                  <Pressable onPress={() => setInterval(i => i + 1)}><Text style={styles.stepperBtn}>+</Text></Pressable>
                </View>
              </View>
            </View>

            {/* Motor Mode */}
            <Text style={styles.label}>Motor Mode</Text>
            <View style={styles.segmentControl}>
              {['Gentle', 'Dynamic', 'Random'].map(mode => (
                <Pressable key={mode} style={[styles.segmentBtn, motorMode === mode && styles.segmentActive]} onPress={() => setMotorMode(mode)}>
                  <Text style={[styles.segmentText, motorMode === mode && styles.segmentTextActive]}>{mode}</Text>
                </Pressable>
              ))}
            </View>

            {/* Light Mode */}
            <Text style={styles.label}>Light Mode</Text>
            <View style={styles.segmentControl}>
              {['Constant', 'Breathing', 'Heartbeat'].map(mode => (
                <Pressable key={mode} style={[styles.segmentBtn, lightMode === mode && styles.segmentActive]} onPress={() => setLightMode(mode)}>
                  <Text style={[styles.segmentText, lightMode === mode && styles.segmentTextActive]}>{mode}</Text>
                </Pressable>
              ))}
            </View>

            {/* GO TO SOUND PAGE BUTTON */}
            <Pressable 
              style={styles.musicButton} 
              onPress={() => {
                setShowOptions(false); // Close modal first
                router.push('/sound'); // Then navigate
              }}>
              <Ionicons name="musical-notes" size={24} color="#fff" />
              <Text style={styles.musicBtnText}>Sound & Music Settings</Text>
            </Pressable>

          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, paddingTop: 60 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  canvasContainer: { width: width, height: height * 0.5, justifyContent: 'center', alignItems: 'center' },
  radarHintText: { color: '#E60000', marginTop: 10, fontWeight: '600', textTransform: 'uppercase' },
  bottomArrowArea: { alignItems: 'center', paddingBottom: 40 },
  optionsHintText: { color: '#fff', fontSize: 16, marginBottom: 5 },
  
  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#121212', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  halfCard: { backgroundColor: '#1e1e1e', padding: 15, borderRadius: 15, width: '48%' },
  label: { color: '#aaa', marginBottom: 10, fontWeight: '600' },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepperBtn: { color: '#E60000', fontSize: 24, fontWeight: 'bold' },
  stepperVal: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  segmentControl: { flexDirection: 'row', backgroundColor: '#1e1e1e', borderRadius: 10, padding: 5, marginBottom: 20 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  segmentActive: { backgroundColor: '#E60000' },
  segmentText: { color: '#aaa', fontWeight: '600', fontSize: 12 },
  segmentTextActive: { color: '#fff' },
  musicButton: { backgroundColor: '#333', flexDirection: 'row', padding: 16, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  musicBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 }
});