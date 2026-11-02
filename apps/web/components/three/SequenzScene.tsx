'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { clamp01, lerp, Plate, SceneLights, smooth } from './Plate';

export interface SequenzSceneProps {
  /** Scroll-Fortschritt 0..1 über die drei Phasen Verlegen (0–⅓), Belasten (⅓–⅔), Aufnehmen (⅔–1). */
  progressRef: React.RefObject<number>;
  /** Wird aufgerufen, sobald der Fortschritt sich ändert → invalidate() bei frameloop="demand". */
  registerInvalidate: (fn: () => void) => void;
}

const LANE = [-3.75, -1.25, 1.25, 3.75];

function Scene({ progressRef, registerInvalidate }: SequenzSceneProps) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => registerInvalidate(invalidate), [invalidate, registerInvalidate]);

  const plates = useRef<(THREE.Group | null)[]>([]);
  const truck = useRef<THREE.Group>(null);
  const grassMat = useRef<THREE.MeshStandardMaterial>(null);
  const mudColor = useMemo(() => new THREE.Color('#8C7A5B'), []);
  const grassColor = useMemo(() => new THREE.Color('#5E9A63'), []);

  useFrame(() => {
    const p = clamp01(progressRef.current ?? 0);
    const lay = smooth(clamp01(p / 0.33));
    const load = smooth(clamp01((p - 0.33) / 0.33));
    const lift = smooth(clamp01((p - 0.66) / 0.34));
    const truckX = lerp(-9, 9, load);

    LANE.forEach((x, i) => {
      const g = plates.current[i];
      if (!g) return;
      const local = smooth(clamp01((lay - i * 0.18) / 0.5));
      const press = Math.max(0, 1 - Math.abs(truckX - x) / 1.6) * 0.05 * (load > 0 && load < 1 ? 1 : 0);
      const y = lerp(3.5, 0, local) - press + lift * 1.6;
      g.position.set(x, y, 0);
      g.rotation.set((1 - local) * 0.5, 0, (1 - local) * (i % 2 ? 0.25 : -0.25) + lift * (i % 2 ? -0.08 : 0.08));
    });

    if (truck.current) {
      truck.current.position.x = truckX;
      truck.current.visible = load > 0 && load < 1;
    }
    if (grassMat.current) {
      grassMat.current.color.copy(mudColor).lerp(grassColor, lift);
    }
  });

  return (
    <>
      <SceneLights />
      {LANE.map((x, i) => (
        <Plate
          key={x}
          position={[x, 3.5, 0]}
          ref={(el) => {
            plates.current[i] = el;
          }}
        />
      ))}
      {/* Wiese (Farbe wechselt von matschig zu grün beim Aufnehmen) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]} receiveShadow>
        <planeGeometry args={[16, 7]} />
        <meshStandardMaterial ref={grassMat} color="#8C7A5B" roughness={1} />
      </mesh>
      {/* Stilisierter LKW-Block */}
      <group ref={truck} position={[-9, 0, 0]} visible={false}>
        <mesh position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[3.2, 1.3, 1.5]} />
          <meshStandardMaterial color="#1E3A2F" roughness={0.6} />
        </mesh>
        <mesh position={[2.1, 0.75, 0]} castShadow>
          <boxGeometry args={[1.1, 0.9, 1.4]} />
          <meshStandardMaterial color="#2A4D3F" roughness={0.6} />
        </mesh>
        <mesh position={[2.45, 0.9, 0]}>
          <boxGeometry args={[0.3, 0.4, 1.1]} />
          <meshStandardMaterial color="#E6EDE3" roughness={0.3} />
        </mesh>
        {[-1.1, 0.4, 1.9].map((wx) =>
          [-0.75, 0.75].map((wz) => (
            <mesh key={`${wx}-${wz}`} position={[wx, 0.3, wz]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.32, 0.32, 0.3, 20]} />
              <meshStandardMaterial color="#1F2A24" roughness={0.9} />
            </mesh>
          )),
        )}
      </group>
    </>
  );
}

export default function SequenzScene(props: SequenzSceneProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.6]}
      shadows
      camera={{ position: [0, 4.2, 9.5], fov: 36, near: 0.1, far: 60 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      style={{ background: 'transparent' }}
      aria-hidden
      onCreated={({ camera }) => camera.lookAt(0, 0.4, 0)}
    >
      <Scene {...props} />
    </Canvas>
  );
}
