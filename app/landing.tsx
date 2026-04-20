import React, { useRef, useState, Suspense } from 'react';
import { 
  View, Text, StyleSheet, Pressable, Dimensions, Modal, ActivityIndicator 
} from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { Mesh } from 'three';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// --- THE WARM RED/ORANGE 3D BALL ---
export function WarmVisioball() {
  const meshRef = useRef<Mesh>(null);
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5; // Smooth horizontal rotation
      meshRef.current.rotation.z += delta * 0.1; // Gentle tilt
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2.5, 64, 64]} />
      <meshStandardMaterial 
        color="#FF6B6B" // Light reddish coral
        emissive="#FFA07A" // Light orange glow
        emissiveIntensity={0.6}
        roughness={0.1} // Glossy
        metalness={0.4}
      />
    </mesh>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [showOptions, setShowOptions] = useState(false);
  
  // Controls State
  const [speed, setSpeed] = useState(12);
  const [interval, setInterval] = useState(15);
  const [motorMode, setMotorMode] = useState('Gentle');
  const [lightMode, setLightMode] = useState('Constant');

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>VISIOBALL</Text>
        <Pressable style={styles.powerBtn}>
          <Ionicons name="power" size={24} color="#3B82F6" />
        </Pressable>
      </View>

      {/* CENTER 3D CANVAS */}
      <View style={styles.canvasWrapper}>
        <Suspense fallback={<ActivityIndicator size="large" color="#3B82F6" />}>
          <Canvas camera={{ position: [0, 0, 7] }}>
            <ambientLight intensity={0.9} color="#ffffff" />
            <directionalLight position={[10, 10, 10]} intensity={2.5} color="#ffffff" />
            <directionalLight position={[-10, -10, 5]} intensity={1} color="#FFDAB9" />
            <WarmVisioball />
          </Canvas>
        </Suspense>
      </View>

      {/* BOTTOM ACTIONS */}
      <View style={styles.bottomSection}>
        <Text style={styles.helperText}>Tap the radar to search for devices</Text>
        
        <View style={styles.actionRow}>
          <Pressable 
            style={({pressed}) => [styles.primaryBtn, pressed && { opacity: 0.8, transform: [{scale: 0.96}] }]}
            onPress={() => router.push('/radar')}
          >
            <Ionicons name="scan" size={24} color="#fff" style={{marginRight: 8}}/>
            <Text style={styles.primaryBtnText}>Radar Scan</Text>
          </Pressable>

          <Pressable 
            style={({pressed}) => [styles.secondaryBtn, pressed && { opacity: 0.8, transform: [{scale: 0.96}] }]}
            onPress={() => setShowOptions(true)}
          >
            <Ionicons name="options" size={24} color="#3B82F6" />
          </Pressable>
        </View>
      </View>

      {/* PREMIUM OPTIONS MODAL */}
      <Modal visible={showOptions} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Device Settings</Text>
              <Pressable onPress={() => setShowOptions(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            {/* Numeric Controls */}
            <View style={styles.row}>
              <View style={styles.numberCard}>
                <Text style={styles.label}>Speed</Text>
                <View style={styles.stepper}>
                  <Pressable onPress={() => setSpeed(s => s - 1)}><Ionicons name="remove-circle" size={32} color="#3B82F6"/></Pressable>
                  <Text style={styles.stepperVal}>{speed}</Text>
                  <Pressable onPress={() => setSpeed(s => s + 1)}><Ionicons name="add-circle" size={32} color="#3B82F6"/></Pressable>
                </View>
              </View>
              <View style={styles.numberCard}>
                <Text style={styles.label}>Interval</Text>
                <View style={styles.stepper}>
                  <Pressable onPress={() => setInterval(i => i - 1)}><Ionicons name="remove-circle" size={32} color="#3B82F6"/></Pressable>
                  <Text style={styles.stepperVal}>{interval}</Text>
                  <Pressable onPress={() => setInterval(i => i + 1)}><Ionicons name="add-circle" size={32} color="#3B82F6"/></Pressable>
                </View>
              </View>
            </View>

            {/* Segment Controls */}
            <Text style={styles.label}>Motor Mode</Text>
            <View style={styles.segmentControl}>
              {['Gentle', 'Dynamic', 'Random'].map(mode => (
                <Pressable key={mode} style={[styles.segmentBtn, motorMode === mode && styles.segmentActive]} onPress={() => setMotorMode(mode)}>
                  <Text style={[styles.segmentText, motorMode === mode && styles.segmentTextActive]}>{mode}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Light Mode</Text>
            <View style={styles.segmentControl}>
              {['Constant', 'Breathing', 'Heartbeat'].map(mode => (
                <Pressable key={mode} style={[styles.segmentBtn, lightMode === mode && styles.segmentActive]} onPress={() => setLightMode(mode)}>
                  <Text style={[styles.segmentText, lightMode === mode && styles.segmentTextActive]}>{mode}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable 
              style={styles.musicButton} 
              onPress={() => { setShowOptions(false); router.push('/sound'); }}>
              <Ionicons name="musical-notes" size={20} color="#fff" />
              <Text style={styles.musicBtnText}>Sound & Music Menu</Text>
              <Ionicons name="chevron-forward" size={20} color="#fff" style={{position: 'absolute', right: 20}} />
            </Pressable>

          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F8FC', justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60 },
  title: { color: '#1E3A8A', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  powerBtn: { backgroundColor: '#DBEAFE', padding: 12, borderRadius: 20 },
  
  canvasWrapper: { width: width, height: height * 0.5 },
  
  bottomSection: { padding: 24, paddingBottom: 40, alignItems: 'center' },
  helperText: { color: '#64748B', fontSize: 14, marginBottom: 20, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 16, width: '100%' },
  primaryBtn: { flex: 1, backgroundColor: '#3B82F6', flexDirection: 'row', padding: 20, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  secondaryBtn: { backgroundColor: '#ffffff', padding: 20, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#94A3B8', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 50, shadowColor: '#000', shadowOffset: {width: 0, height: -10}, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#CBD5E1', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#0F172A', fontSize: 24, fontWeight: '800' },
  closeBtn: { backgroundColor: '#F1F5F9', padding: 8, borderRadius: 16 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  numberCard: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 20, width: '48%', borderWidth: 1, borderColor: '#E2E8F0' },
  label: { color: '#64748B', marginBottom: 12, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepperVal: { color: '#1E3A8A', fontSize: 24, fontWeight: '900' },
  
  segmentControl: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 6, marginBottom: 24 },
  segmentBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  segmentActive: { backgroundColor: '#FFFFFF', shadowColor: '#64748B', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  segmentText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
  segmentTextActive: { color: '#3B82F6' },
  
  musicButton: { backgroundColor: '#3B82F6', flexDirection: 'row', padding: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#3B82F6', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.3, shadowRadius: 8 },
  musicBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 }
});