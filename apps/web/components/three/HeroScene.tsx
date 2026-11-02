'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { clamp01, lerp, Plate, SceneLights, smooth } from './Plate';

export interface HeroSceneProps {
  /** Scroll-Fortschritt 0..1 (loser Stapel → verlegte Fläche), als Ref für die Frame-Schleife. */
  progressRef: React.RefObject<number>;
  /** Mausposition -1..1 für die Kamera-Parallaxe. */
  pointerRef: React.RefObject<{ x: number; y: number }>;
  active: boolean;
  /** Seitlicher Versatz der Platten (Desktop: rechts neben dem Text). */
  offsetX?: number;
}

const COUNT = 9;

interface Pose {
  stack: { p: THREE.Vector3; r: THREE.Euler };
  laid: { p: THREE.Vector3; r: THREE.Euler };
  phase: number;
}

function buildPoses(): Pose[] {
  const poses: Pose[] = [];
  // Deterministische „Zufälligkeit“ für den losen Stapel
  const rnd = (i: number, k: number) => {
    const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 0; i < COUNT; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const laid = {
      p: new THREE.Vector3((col - 1) * 2.5, 0, (row - 1) * 1.3),
      r: new THREE.Euler(0, 0, 0),
    };
    const stack = {
      p: new THREE.Vector3((rnd(i, 1) - 0.5) * 1.6, 0.35 + i * 0.3 + rnd(i, 2) * 0.25, (rnd(i, 3) - 0.5) * 1.2),
      r: new THREE.Euler((rnd(i, 4) - 0.5) * 0.35, (rnd(i, 5) - 0.5) * 1.2, (rnd(i, 6) - 0.5) * 0.3),
    };
    poses.push({ stack, laid, phase: rnd(i, 7) * Math.PI * 2 });
  }
  return poses;
}

function Plates({ progressRef, offsetX = 0 }: Pick<HeroSceneProps, 'progressRef' | 'offsetX'>) {
  const poses = useMemo(buildPoses, []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const p = smooth(clamp01(progressRef.current ?? 0));
    poses.forEach((pose, i) => {
      const g = refs.current[i];
      if (!g) return;
      // Jede Platte ordnet sich leicht versetzt ein (Reihenfolge von oben nach unten)
      const local = smooth(clamp01((p - i * 0.04) / 0.7));
      const floatY = (1 - local) * Math.sin(t * 0.7 + pose.phase) * 0.08;
      g.position.set(
        lerp(pose.stack.p.x, pose.laid.p.x, local),
        lerp(pose.stack.p.y, pose.laid.p.y, local) + floatY,
        lerp(pose.stack.p.z, pose.laid.p.z, local),
      );
      g.rotation.set(
        lerp(pose.stack.r.x, pose.laid.r.x, local) + (1 - local) * Math.sin(t * 0.5 + pose.phase) * 0.03,
        lerp(pose.stack.r.y, pose.laid.r.y, local),
        lerp(pose.stack.r.z, pose.laid.r.z, local),
      );
    });
    if (group.current) {
      group.current.rotation.y = lerp(0.35, 0.05, p) + Math.sin(t * 0.15) * 0.03;
      group.current.position.x = offsetX;
    }
  });

  return (
    <group ref={group} position={[offsetX, 0, 0]}>
      {poses.map((_, i) => (
        <Plate
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        />
      ))}
      {/* Boden: Salbei-Scheibe, nimmt Schatten an */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]} receiveShadow>
        <circleGeometry args={[6.5, 48]} />
        <meshStandardMaterial color="#2A4D3F" roughness={1} />
      </mesh>
    </group>
  );
}

function CameraRig({ pointerRef }: Pick<HeroSceneProps, 'pointerRef'>) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(0, 0.2, 0), []);
  useFrame(() => {
    const px = pointerRef.current?.x ?? 0;
    const py = pointerRef.current?.y ?? 0;
    camera.position.x = lerp(camera.position.x, px * 0.9, 0.05);
    camera.position.y = lerp(camera.position.y, 3.4 - py * 0.5, 0.05);
    camera.lookAt(target);
  });
  return null;
}

export default function HeroScene({ progressRef, pointerRef, active, offsetX = 0 }: HeroSceneProps) {
  const ready = useRef(false);
  useEffect(() => {
    ready.current = true;
  }, []);
  return (
    <Canvas
      frameloop={active ? 'always' : 'demand'}
      dpr={[1, 1.6]}
      shadows
      camera={{ position: [0, 3.4, 8.5], fov: 38, near: 0.1, far: 60 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      style={{ background: 'transparent' }}
      aria-hidden
    >
      <SceneLights />
      <Plates progressRef={progressRef} offsetX={offsetX} />
      <CameraRig pointerRef={pointerRef} />
    </Canvas>
  );
}
