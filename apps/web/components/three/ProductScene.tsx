'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { lerp, Plate, SceneLights } from './Plate';

export interface ProductSceneProps {
  /** Zielrotation (rad) um Y und X, von Drag oder Tasten gesetzt. */
  rotationRef: React.RefObject<{ y: number; x: number; auto: boolean }>;
  active: boolean;
}

function Turntable({ rotationRef }: Pick<ProductSceneProps, 'rotationRef'>) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    const g = group.current;
    const r = rotationRef.current;
    if (!g || !r) return;
    if (r.auto) r.y += delta * 0.25;
    g.rotation.y = lerp(g.rotation.y, r.y, 0.12);
    g.rotation.x = lerp(g.rotation.x, r.x, 0.12);
  });
  return (
    <group ref={group} rotation={[0.35, 0.6, 0]}>
      <Plate />
    </group>
  );
}

export default function ProductScene({ rotationRef, active }: ProductSceneProps) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'demand'}
      dpr={[1, 1.8]}
      camera={{ position: [0, 1.4, 3.6], fov: 40, near: 0.1, far: 30 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      style={{ background: 'transparent' }}
      aria-hidden
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
    >
      <SceneLights intensity={1.1} />
      <Turntable rotationRef={rotationRef} />
    </Canvas>
  );
}
