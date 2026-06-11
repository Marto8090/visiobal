import { useFrame } from '@react-three/fiber/native';
import { useMemo, useRef } from 'react';
import type { Points } from 'three';
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  MathUtils,
  Mesh,
  PointLight,
} from 'three';

type TexturedVisioballProps = {
  rotationX?: number;
  rotationY?: number;
  rotationRef?: { current: { x: number; y: number } };
  onHoverOffset?: (offset: number) => void;
};

type SurfaceDetail = {
  key: string;
  lat: number;
  lon: number;
  scale: number;
  twist: number;
};

const BALL_RADIUS = 1.3;
const DETAIL_RADIUS = BALL_RADIUS + 0.002;
const SEAM_RADIUS = BALL_RADIUS + 0.003;
const SEAM_HALF_WIDTH = 0.078;
const SEAM_SEGMENTS = 144;
const HONEYCOMB_SECTOR_CENTERS = [
  -Math.PI * 0.80,
  -Math.PI * 0.25,
  Math.PI * 0.25,
  Math.PI * 0.75,
];
const HONEYCOMB_LATITUDES = [-0.84, -0.63, -0.42, -0.21, 0.21, 0.42, 0.63, 0.84];
const HONEYCOMB_LONGITUDE_OFFSETS = [-0.42, -0.21, 0, 0.21, 0.42];
const HONEYCOMB_LONGITUDE_SHIFT = 0.1;
const POLAR_HONEYCOMB_LATITUDES = [-1.03, 1.03];
const POLAR_HONEYCOMB_LONGITUDE_OFFSETS = [-0.2, 0, 0.2];

function createSurfaceDetail(lat: number, lon: number, scale: number, key: string): SurfaceDetail {
  return {
    key,
    lat,
    lon,
    scale,
    twist: Math.PI / 6,
  };
}

function createHoneycombDetails(): SurfaceDetail[] {
  const details: SurfaceDetail[] = [];

  HONEYCOMB_SECTOR_CENTERS.forEach((sectorLon, sectorIndex) => {
    HONEYCOMB_LATITUDES.forEach((lat, rowIndex) => {
      HONEYCOMB_LONGITUDE_OFFSETS.forEach((offset, colIndex) => {
        const stagger = rowIndex % 2 === 0 ? 0.08 : -0.08;
        const lon = sectorLon + offset + stagger + HONEYCOMB_LONGITUDE_SHIFT;
        const nearPoleScale = 1 - Math.abs(lat) * 0.25;

        details.push(createSurfaceDetail(
          lat,
          lon,
          0.85 * nearPoleScale,
          `${sectorIndex}-${rowIndex}-${colIndex}`
        ));
      });
    });
  });

  HONEYCOMB_SECTOR_CENTERS.forEach((sectorLon, sectorIndex) => {
    POLAR_HONEYCOMB_LATITUDES.forEach((lat, polarIndex) => {
      POLAR_HONEYCOMB_LONGITUDE_OFFSETS.forEach((offset, colIndex) => {
        details.push(createSurfaceDetail(
          lat,
          sectorLon + offset + HONEYCOMB_LONGITUDE_SHIFT,
          0.58,
          `polar-${sectorIndex}-${polarIndex}-${colIndex}`
        ));
      });
    });
  });

  return details;
}

function HoneycombCell({ detail }: { detail: SurfaceDetail }) {
  return (
    <group rotation={[0, detail.lon, 0]}>
      <group rotation={[-detail.lat, 0, 0]}>
        <group position={[0, 0, DETAIL_RADIUS]} rotation={[0, 0, detail.twist]} scale={detail.scale}>
          <mesh position={[0, 0, 0.0005]}>
            <circleGeometry args={[0.078, 6]} />
            <meshStandardMaterial color="#ef6b70" roughness={0.78} metalness={0} side={DoubleSide} />
          </mesh>
          <mesh position={[0, 0, 0.0015]}>
            <circleGeometry args={[0.054, 6]} />
            <meshStandardMaterial color="#8e2430" roughness={0.92} metalness={0} side={DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function SeamRing({ rotation }: { rotation: [number, number, number] }) {
  const seamGeometry = useMemo(() => {
    const positions: number[] = [];
    const indices: number[] = [];

    for (let index = 0; index <= SEAM_SEGMENTS; index += 1) {
      const angle = (index / SEAM_SEGMENTS) * Math.PI * 2;

      [-SEAM_HALF_WIDTH, SEAM_HALF_WIDTH].forEach((surfaceOffset) => {
        const ringRadius = Math.sqrt(Math.max(SEAM_RADIUS * SEAM_RADIUS - surfaceOffset * surfaceOffset, 0));

        positions.push(
          Math.cos(angle) * ringRadius,
          Math.sin(angle) * ringRadius,
          surfaceOffset
        );
      });
    }

    for (let index = 0; index < SEAM_SEGMENTS; index += 1) {
      const current = index * 2;
      const next = current + 2;

      indices.push(current, next, current + 1);
      indices.push(current + 1, next, next + 1);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }, []);

  return (
    <mesh renderOrder={3} rotation={rotation}>
      <primitive attach="geometry" object={seamGeometry} />
      <meshBasicMaterial color="#7e2c32" depthWrite={false} opacity={0.9} side={DoubleSide} transparent />
    </mesh>
  );
}

export function TexturedVisioball({ rotationX = 0, rotationY = 0, rotationRef, onHoverOffset }: TexturedVisioballProps) {
  const coreRef = useRef<Mesh>(null);
  const detailGroupRef = useRef<Group>(null);
  const shadowRef = useRef<Mesh>(null);
  const orbitLightRef = useRef<PointLight>(null);
  const honeycombDetails = useMemo(createHoneycombDetails, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (coreRef.current && detailGroupRef.current) {
      const liveRotation = rotationRef?.current;
      const baseRotationX = liveRotation?.x ?? rotationX;
      const baseRotationY = liveRotation?.y ?? rotationY;
      const idleX = Math.sin(time * 0.5) * 0.1;
      const nextRotationY = time * 0.3 + baseRotationY;
      const nextRotationX = idleX + baseRotationX;

      coreRef.current.rotation.y = nextRotationY;
      coreRef.current.rotation.x = nextRotationX;
      detailGroupRef.current.rotation.y = nextRotationY;
      detailGroupRef.current.rotation.x = nextRotationX;
    }

    if (orbitLightRef.current) {
      orbitLightRef.current.position.x = Math.sin(time) * 4;
      orbitLightRef.current.position.z = Math.cos(time) * 4;
      orbitLightRef.current.position.y = Math.sin(time * 1.5) * 2;
    }

    const hoverOffset = Math.sin(time * 1.5) * 0.2;

    onHoverOffset?.(hoverOffset);

    if (coreRef.current) {
      coreRef.current.position.y = hoverOffset;
    }

    if (detailGroupRef.current) {
      detailGroupRef.current.position.y = hoverOffset;
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
        <sphereGeometry args={[BALL_RADIUS, 96, 96]} />
        <meshPhysicalMaterial
          clearcoat={0.25}
          clearcoatRoughness={0.72}
          color="#d84e59"
          emissive="#3d0d14"
          emissiveIntensity={0.04}
          metalness={0}
          roughness={0.84}
        />
      </mesh>

      <group ref={detailGroupRef}>
        <SeamRing rotation={[Math.PI / 2, 0, 0]} />
        <SeamRing rotation={[0, Math.PI / 2, 0]} />
        <SeamRing rotation={[0, 0, 0]} />
        {honeycombDetails.map((detail) => (
          <HoneycombCell key={detail.key} detail={detail} />
        ))}
      </group>

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
