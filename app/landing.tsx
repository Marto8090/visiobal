import React, { useState, Suspense } from 'react';
import { 
  View, Text, StyleSheet, Pressable, Dimensions, Modal, ActivityIndicator 
} from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { BackgroundDust, TexturedVisioball } from '@/src/components/VisioballModel';

const { width, height } = Dimensions.get('window');

export default function LandingPage() {
  const router = useRouter();
  const [showOptions, setShowOptions] = useState(false);
  
  const [speed, setSpeed] = useState(12);
  const [interval, setInterval] = useState(15);
  const [motorMode, setMotorMode] = useState('Gentle');
  const [lightMode, setLightMode] = useState('Constant');

  return (
    <View style={styles.container}>
      {/* FROSTED PREMIUM GRADIENT BACKGROUND */}
      <LinearGradient 
        colors={['#E6F0FA', '#F4F7FC', '#FFFFFF']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject} 
      />

      <View style={styles.header}>
        <Text style={styles.title}>VISIOBALL</Text>
        <Pressable style={styles.powerBtn}>
          <Ionicons name="power" size={24} color="#3B82F6" />
        </Pressable>
      </View>

      <View style={styles.canvasWrapper}>
        <Suspense fallback={<ActivityIndicator size="large" color="#3B82F6" />}>
          <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
            <ambientLight intensity={0.6} color="#ffffff" />
            <directionalLight position={[10, 10, 10]} intensity={2} color="#ffffff" />
            <directionalLight position={[-10, 5, -5]} intensity={2.5} color="#FFDAB9" />
            <directionalLight position={[0, -10, 5]} intensity={1.5} color="#3B82F6" />
            
            <BackgroundDust />
            <TexturedVisioball />
          </Canvas>
        </Suspense>
      </View>

      <View style={styles.bottomSection}>
        <Text style={styles.helperText}>Tap the radar to search for devices</Text>
        <View style={styles.actionRow}>
          <Pressable 
            style={({pressed}) => [styles.primaryBtn, pressed && styles.btnPressed]}
            onPress={() => router.push('/radar')}
          >
            <Ionicons name="scan" size={24} color="#fff" style={{marginRight: 8}}/>
            <Text style={styles.primaryBtnText}>Radar Scan</Text>
          </Pressable>

          <Pressable 
            style={({pressed}) => [styles.secondaryBtn, pressed && styles.btnPressed]}
            onPress={() => setShowOptions(true)}
          >
            <Ionicons name="options" size={24} color="#3B82F6" />
          </Pressable>
        </View>
      </View>

      {/* OPTIONS MODAL */}
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
              style={({pressed}) => [styles.musicButton, pressed && styles.btnPressed]} 
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
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, zIndex: 10 },
  title: { color: '#1E3A8A', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  powerBtn: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 20, shadowColor: '#94A3B8', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  
  canvasWrapper: { position: 'absolute', top: 0, left: 0, width: width, height: height * 0.75 },
  
  bottomSection: { padding: 24, paddingBottom: 40, alignItems: 'center', zIndex: 10 },
  helperText: { color: '#475569', fontSize: 14, marginBottom: 20, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 16, width: '100%' },
  primaryBtn: { flex: 1, backgroundColor: '#3B82F6', flexDirection: 'row', padding: 20, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  secondaryBtn: { backgroundColor: '#ffffff', padding: 20, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#94A3B8', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.3)' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: 50, shadowColor: '#000', shadowOffset: {width: 0, height: -10}, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  modalHandle: { width: 44, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#0F172A', fontSize: 24, fontWeight: '900' },
  closeBtn: { backgroundColor: '#F8FAFC', padding: 8, borderRadius: 16 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  numberCard: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 20, width: '48%', borderWidth: 1, borderColor: '#F1F5F9' },
  label: { color: '#64748B', marginBottom: 12, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepperVal: { color: '#1E3A8A', fontSize: 26, fontWeight: '900' },
  
  segmentControl: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 6, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  segmentBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
  segmentActive: { backgroundColor: '#FFFFFF', shadowColor: '#94A3B8', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  segmentText: { color: '#64748B', fontWeight: '800', fontSize: 13 },
  segmentTextActive: { color: '#3B82F6' },
  
  musicButton: { backgroundColor: '#3B82F6', flexDirection: 'row', padding: 22, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#3B82F6', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.3, shadowRadius: 12 },
  
  // ADD THIS LINE RIGHT HERE:
  musicBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 }
});
