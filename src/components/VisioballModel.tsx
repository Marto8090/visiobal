import { useFrame } from '@react-three/fiber/native';
import { useLayoutEffect, useMemo, useRef } from 'react';
import type { Points } from 'three';
import {
  BufferGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  MathUtils,
  Mesh,
  PointLight,
  Quaternion,
  Vector3,
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

// Auto-rotation: continuous 360° spin around an axis tilted off vertical,
// so the ball tumbles diagonally (you see top + bottom, not just the sides).
const TUMBLE_TILT_DEG = 40;
const TUMBLE_SPEED = 0.3; // radians per second around the tilted axis

const BALL_RADIUS = 1.3;
const DETAIL_RADIUS = BALL_RADIUS + 0.002;
const SEAM_RADIUS = BALL_RADIUS + 0.003;
const SEAM_HALF_WIDTH = 0.078;
const SEAM_SEGMENTS = 96;
const HONEYCOMB_OUTER_DEPTH = 0.0005;
const HONEYCOMB_INNER_DEPTH = 0.0015;
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

function createSurfaceMatrix(detail: SurfaceDetail, depthOffset: number) {
  const matrix = new Matrix4();
  const transform = new Matrix4();

  matrix.makeRotationY(detail.lon);
  matrix.multiply(transform.makeRotationX(-detail.lat));
  matrix.multiply(transform.makeTranslation(0, 0, DETAIL_RADIUS + depthOffset));
  matrix.multiply(transform.makeRotationZ(detail.twist));
  matrix.scale(new Vector3(detail.scale, detail.scale, detail.scale));

  return matrix;
}

function HoneycombCells({ details }: { details: SurfaceDetail[] }) {
  const outerRef = useRef<InstancedMesh>(null);
  const innerRef = useRef<InstancedMesh>(null);
  const outerMatrices = useMemo(
    () => details.map((detail) => createSurfaceMatrix(detail, HONEYCOMB_OUTER_DEPTH)),
    [details]
  );
  const innerMatrices = useMemo(
    () => details.map((detail) => createSurfaceMatrix(detail, HONEYCOMB_INNER_DEPTH)),
    [details]
  );

  useLayoutEffect(() => {
    outerMatrices.forEach((matrix, index) => {
      outerRef.current?.setMatrixAt(index, matrix);
    });
    innerMatrices.forEach((matrix, index) => {
      innerRef.current?.setMatrixAt(index, matrix);
    });

    if (outerRef.current) {
      outerRef.current.instanceMatrix.needsUpdate = true;
    }

    if (innerRef.current) {
      innerRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [innerMatrices, outerMatrices]);

  return (
    <>
      <instancedMesh ref={outerRef} args={[undefined, undefined, details.length]} renderOrder={2}>
        <circleGeometry args={[0.078, 6]} />
        <meshStandardMaterial color="#ef6b70" roughness={0.78} metalness={0} side={DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={innerRef} args={[undefined, undefined, details.length]} renderOrder={3}>
        <circleGeometry args={[0.054, 6]} />
        <meshStandardMaterial color="#8e2430" roughness={0.92} metalness={0} side={DoubleSide} />
      </instancedMesh>
    </>
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

  // Tilted spin axis + scratch quaternions, allocated once per instance.
  const tumbleAxis = useMemo(() => {
    const tilt = MathUtils.degToRad(TUMBLE_TILT_DEG);
    return new Vector3(Math.sin(tilt), Math.cos(tilt), 0).normalize();
  }, []);
  const autoQuat = useMemo(() => new Quaternion(), []);
  const dragQuat = useMemo(() => new Quaternion(), []);
  const dragEuler = useMemo(() => new Euler(), []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (coreRef.current && detailGroupRef.current) {
      const liveRotation = rotationRef?.current;
      const baseRotationX = liveRotation?.x ?? rotationX;
      const baseRotationY = liveRotation?.y ?? rotationY;

      // Continuous 360° tumble around the tilted axis.
      autoQuat.setFromAxisAngle(tumbleAxis, time * TUMBLE_SPEED);
      // User drag (or static props) layered on top of the tumble.
      dragEuler.set(baseRotationX, baseRotationY, 0);
      dragQuat.setFromEuler(dragEuler);
      dragQuat.multiply(autoQuat);

      coreRef.current.quaternion.copy(dragQuat);
      detailGroupRef.current.quaternion.copy(dragQuat);
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
        <sphereGeometry args={[BALL_RADIUS, 64, 48]} />
        <meshStandardMaterial
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
        <HoneycombCells details={honeycombDetails} />
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
      <sphereGeometry args={[8, 32, 24]} />
      <pointsMaterial color="#3B82F6" opacity={0.5} size={0.04} sizeAttenuation transparent />
    </points>
  );
}
