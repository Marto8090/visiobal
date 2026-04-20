import { useFrame } from '@react-three/fiber/native';
import { useRef } from 'react';
import { MathUtils, Mesh, PointLight } from 'three';
import type { Points } from 'three';

type TexturedVisioballProps = {
  rotationX?: number;
  rotationY?: number;
};

export function TexturedVisioball({ rotationX = 0, rotationY = 0 }: TexturedVisioballProps) {
  const coreRef = useRef<Mesh>(null);
  const textureShellRef = useRef<Mesh>(null);
  const shadowRef = useRef<Mesh>(null);
  const orbitLightRef = useRef<PointLight>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (coreRef.current && textureShellRef.current) {
      const idleX = Math.sin(time * 0.5) * 0.1;
      const idleShellX = Math.cos(time * 0.4) * 0.15;

      coreRef.current.rotation.y = time * 0.3 + rotationY;
      coreRef.current.rotation.x = idleX + rotationX;
      textureShellRef.current.rotation.y = -time * 0.15 + rotationY;
      textureShellRef.current.rotation.x = idleShellX + rotationX;
    }

    if (orbitLightRef.current) {
      orbitLightRef.current.position.x = Math.sin(time) * 4;
      orbitLightRef.current.position.z = Math.cos(time) * 4;
      orbitLightRef.current.position.y = Math.sin(time * 1.5) * 2;
    }

    const hoverOffset = Math.sin(time * 1.5) * 0.2;

    if (coreRef.current) {
      coreRef.current.position.y = hoverOffset;
    }

    if (textureShellRef.current) {
      textureShellRef.current.position.y = hoverOffset;
    }

    if (shadowRef.current) {
      shadowRef.current.scale.setScalar(1 - hoverOffset * 0.4);
      const material = shadowRef.current.material;

      if (!Array.isArray(material)) {
        material.opacity = MathUtils.lerp(0.25, 0.05, (hoverOffset + 0.2) / 0.4);
      }
    }
  });

  return (
    <group>
      <pointLight ref={orbitLightRef} color="#FFFFFF" distance={10} intensity={3} />

      <mesh ref={coreRef}>
        <sphereGeometry args={[1.3, 64, 64]} />
        <meshPhysicalMaterial
          clearcoat={1}
          clearcoatRoughness={0.1}
          color="#FF4757"
          emissive="#FF6B81"
          emissiveIntensity={0.3}
          metalness={0.5}
          roughness={0.05}
        />
      </mesh>

      <mesh ref={textureShellRef}>
        <icosahedronGeometry args={[1.32, 4]} />
        <meshStandardMaterial color="#ffffff" opacity={0.12} transparent wireframe />
      </mesh>

      <mesh ref={shadowRef} position={[0, -2.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial color="#1E3A8A" opacity={0.2} transparent />
      </mesh>
    </group>
  );
}

export function BackgroundDust() {
  const pointsRef = useRef<Points>(null);

  useFrame((state, delta) => {
    if (!pointsRef.current) {
      return;
    }

    pointsRef.current.rotation.y -= delta * 0.03;
    pointsRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.5;
  });

  return (
    <points ref={pointsRef}>
      <sphereGeometry args={[8, 48, 48]} />
      <pointsMaterial color="#3B82F6" opacity={0.5} size={0.04} sizeAttenuation transparent />
    </points>
  );
}
