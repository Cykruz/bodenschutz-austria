'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { clamp01, lerp, Plate, SceneLights, smooth } from './Plate';
import { LowPolyTree, LowPolyTruck } from './Truck';

export interface SequenzSceneProps {
  /** Scroll-Fortschritt 0..1 über die drei Phasen Verlegen (0–⅓), Belasten (⅓–⅔), Aufnehmen (⅔–1). */
  progressRef: React.RefObject<number>;
  /** Wird aufgerufen, sobald der Fortschritt sich ändert → invalidate() bei frameloop="demand". */
  registerInvalidate: (fn: () => void) => void;
}

// Zwei Fahrspuren (z = ±1) mit je vier Platten entlang x
const LANE_X = [-3.75, -1.25, 1.25, 3.75];
const LANE_Z = [-1.0, 1.0];
const PLATES = LANE_Z.flatMap((z, zi) => LANE_X.map((x, xi) => ({ x, z, order: xi * 2 + zi })));

const WIDE_POS = new THREE.Vector3(0, 5.2, 13);
const WIDE_TARGET = new THREE.Vector3(0, 0.4, 0);

/** Fahrtweg des LKW in der Belasten-Phase: einfahren (0–0,22), stehen (0,22–0,78, Kamera kreist), ausfahren (0,78–1). */
function truckX(load: number): number {
  if (load < 0.22) return lerp(-11, 0, smooth(load / 0.22));
  if (load < 0.78) return 0;
  return lerp(0, 11, smooth((load - 0.78) / 0.22));
}

function Scene({ progressRef, registerInvalidate }: SequenzSceneProps) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => registerInvalidate(invalidate), [invalidate, registerInvalidate]);

  const plates = useRef<(THREE.Group | null)[]>([]);
  const truck = useRef<THREE.Group>(null);
  const grassMat = useRef<THREE.MeshStandardMaterial>(null);
  const mudColor = useMemo(() => new THREE.Color('#8C7A5B'), []);
  const grassColor = useMemo(() => new THREE.Color('#5E9A63'), []);
  const camPos = useMemo(() => new THREE.Vector3(), []);
  const camTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }) => {
    const p = clamp01(progressRef.current ?? 0);
    const lay = smooth(clamp01(p / 0.33));
    const load = clamp01((p - 0.33) / 0.33);
    const lift = smooth(clamp01((p - 0.66) / 0.34));
    const tx = truckX(load);
    const onPlates = load > 0 && load < 1;

    PLATES.forEach((pl, i) => {
      const g = plates.current[i];
      if (!g) return;
      const local = smooth(clamp01((lay - pl.order * 0.09) / 0.4));
      // Platte gibt unter den Rädern minimal nach
      const press = onPlates ? Math.max(0, 1 - Math.abs(tx - pl.x) / 2.2) * 0.04 : 0;
      const y = lerp(3.5, 0, local) - press + lift * (1.4 + pl.order * 0.08);
      g.position.set(pl.x, y, pl.z);
      g.rotation.set((1 - local) * 0.5, 0, (1 - local) * (pl.order % 2 ? 0.25 : -0.25) + lift * (pl.order % 2 ? -0.08 : 0.08));
    });

    if (truck.current) {
      truck.current.position.x = tx;
      truck.current.visible = onPlates;
    }
    if (grassMat.current) grassMat.current.color.copy(mudColor).lerp(grassColor, lift);

    // Kamera: in der Belasten-Phase heranfahren, einmal um den LKW kreisen (360°), wieder herausfahren.
    // Glockenkurve 0→1→0 über die Phase; Kreisbahn über den mittleren Abschnitt.
    const zoom = onPlates ? smooth(clamp01(load / 0.3)) * smooth(clamp01((1 - load) / 0.3)) : 0;
    const orbit = clamp01((load - 0.22) / 0.56);
    const angle = Math.PI * 2 * smooth(orbit) + 0.35;
    const radius = lerp(13, 9.8, zoom);
    const height = lerp(5.2, 4.6, zoom);
    const orbitX = tx + Math.sin(angle) * radius;
    const orbitZ = Math.cos(angle) * radius;
    camPos.set(lerp(WIDE_POS.x, orbitX, zoom), height, lerp(WIDE_POS.z, orbitZ, zoom));
    camTarget.set(lerp(WIDE_TARGET.x, tx, zoom), lerp(WIDE_TARGET.y, 1.2, zoom), 0);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
  });

  return (
    <>
      <SceneLights />
      {PLATES.map((pl, i) => (
        <Plate
          key={`${pl.x}-${pl.z}`}
          position={[pl.x, 3.5, pl.z]}
          ref={(el) => {
            plates.current[i] = el;
          }}
        />
      ))}
      {/* Wiese (Farbe wechselt von matschig zu grün beim Aufnehmen) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]} receiveShadow>
        <planeGeometry args={[220, 180]} />
        <meshStandardMaterial ref={grassMat} color="#8C7A5B" roughness={1} />
      </mesh>
      {/* Kulisse: Low-Poly-Bäume im Hintergrund und am Rand */}
      <LowPolyTree position={[-9, 0, -6]} scale={1.3} dark />
      <LowPolyTree position={[-5.5, 0, -8]} scale={1.1} />
      <LowPolyTree position={[0.5, 0, -9]} scale={1.5} dark />
      <LowPolyTree position={[6, 0, -7.5]} scale={1.2} />
      <LowPolyTree position={[10, 0, -5.5]} scale={1.0} dark />
      <LowPolyTree position={[-10, 0, 5]} scale={0.9} />
      <LowPolyTree position={[11, 0, 6]} scale={1.1} dark />
      <LowPolyTruck ref={truck} position={[-11, 0.08, 0]} visible={false} />
    </>
  );
}

export default function SequenzScene(props: SequenzSceneProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.6]}
      shadows
      camera={{ position: [0, 5.2, 13], fov: 36, near: 0.1, far: 120 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      style={{ background: 'transparent' }}
      aria-hidden
      onCreated={({ camera }) => camera.lookAt(0, 0.4, 0)}
    >
      <Scene {...props} />
    </Canvas>
  );
}
